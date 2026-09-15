package resource

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strconv"

	claims "github.com/grafana/authlib/types"
	"github.com/grafana/grafana-app-sdk/app"
	"github.com/grafana/grafana/pkg/apimachinery/utils"
	"github.com/grafana/grafana/pkg/storage/unified/resourcepb"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"k8s.io/apimachinery/pkg/selection"
)

func (s *server) listWithSelectors(ctx context.Context, req *resourcepb.ListRequest) (*resourcepb.ListResponse, error) {
	ctx, span := tracer.Start(ctx, "resource.server.ListWithFieldSelectors")
	defer span.End()

	if req.Options.Key.Namespace == "" {
		return &resourcepb.ListResponse{
			Error: NewBadRequestError("namespace must be specified for list with filter"),
		}, nil
	}

	for _, v := range req.Options.Fields {
		v.Key = SEARCH_SELECTABLE_FIELDS_PREFIX + v.Key
	}

	srq := &resourcepb.ResourceSearchRequest{
		Options: req.Options,
		Limit:   req.Limit,
	}

	var listRv int64
	if req.NextPageToken != "" {
		span.AddEvent("continue token present")
		token, err := GetContinueToken(req.NextPageToken)
		if err != nil {
			return &resourcepb.ListResponse{
				Error: NewBadRequestError("invalid continue token"),
			}, nil
		}
		if tokenFromOtherListPath(token, true) {
			return &resourcepb.ListResponse{
				Error: NewBadRequestError("continue token was not issued for a search-backed list"),
			}, nil
		}
		listRv = token.ResourceVersion
		srq.SearchAfter = token.SearchAfter
		srq.SearchBefore = token.SearchBefore
	}

	var searchResp *resourcepb.ResourceSearchResponse
	var err error
	if s.search != nil {
		// Use local search service
		searchResp, err = s.search.Search(ctx, srq)
	} else {
		// Use remote search service
		// shouldUseSearchForList() already checks that either s.search or s.searchClient is set
		searchResp, err = s.searchClient.Search(ctx, srq)
	}
	if err != nil {
		return nil, err
	}
	// Logged as well as returned, because in environments where only logs are
	// available an empty page and a failed search look the same.
	if err := ErrorFromResponse(searchResp.GetError(), nil); err != nil {
		s.log.Error("Search failed for List with selectors", "group", req.Options.Key.Group, "resource", req.Options.Key.Resource, "error", err)
		return &resourcepb.ListResponse{Error: AsErrorResult(err)}, nil
	}
	span.AddEvent("search finished", trace.WithAttributes(attribute.Int64("total_hits", searchResp.TotalHits)))

	// If it's the first page, set the listRv to the search response RV
	if listRv <= 0 {
		listRv = searchResp.ResourceVersion
	}

	pageBytes := 0
	rsp := &resourcepb.ListResponse{
		ResourceVersion: listRv,
	}

	s.log.Info("Search used for List with selectors", "group", req.Options.Key.Group, "resource", req.Options.Key.Resource, "search_hits", searchResp.TotalHits, "with_pagination", req.NextPageToken != "", "search_after", srq.SearchAfter, "selectable_fields", req.Options.Fields, "labels", req.Options.Labels)

	rows := searchResp.GetResults().GetRows()

	// Read in chunks and stop once the page is full, so a large page neither
	// pulls every body into memory nor lets a later hit's error fail a list the
	// client would never have paged to.
	for chunk := range slices.Chunk(rows, searchReadChunkSize) {
		values, batched, err := s.readSearchRows(ctx, chunk)
		if err != nil {
			return nil, err
		}

		// The batched read did no authorization, so check the chunk in one call.
		// The per-resource fallback authorizes inside Read.
		var authorized []bool
		if batched {
			authorized, err = s.authorizeSearchRows(ctx, req, chunk, values)
			if err != nil {
				return &resourcepb.ListResponse{Error: AsErrorResult(err)}, nil
			}
		}

		for i, row := range chunk {
			val := values[i]
			if val == nil {
				return &resourcepb.ListResponse{Error: &resourcepb.ErrorResult{
					Code:    http.StatusInternalServerError,
					Message: "empty resource read response",
				}}, nil
			}
			if err := ErrorFromResponse(val.Error, nil); err != nil {
				resErr := AsErrorResult(err)
				if resErr.Code == http.StatusForbidden {
					continue
				}
				return &resourcepb.ListResponse{Error: resErr}, nil
			}
			if batched && !authorized[i] {
				continue
			}
			pageBytes += len(val.Value)
			rsp.Items = append(rsp.Items, &resourcepb.ResourceWrapper{
				Value:           val.Value,
				ResourceVersion: val.ResourceVersion,
			})
			if (req.Limit > 0 && len(rsp.Items) >= int(req.Limit)) || pageBytes >= s.maxPageSizeBytes {
				token, err := NewSearchContinueToken(row.GetSortFields(), listRv)
				if err != nil {
					return &resourcepb.ListResponse{
						Error: NewBadRequestError("invalid continue token"),
					}, nil
				}
				rsp.NextPageToken = token
				return rsp, nil
			}
		}
	}

	return rsp, nil
}

// searchReadChunkSize caps the over-read to one chunk while keeping reads batched.
const searchReadChunkSize = 50

// readSearchRows reads the bodies for one chunk of search hits, batched when the
// backend supports it and per-resource otherwise.
func (s *server) readSearchRows(ctx context.Context, rows []*resourcepb.ResourceTableRow) ([]*BackendReadResponse, bool, error) {
	requests := make([]*resourcepb.ReadRequest, len(rows))
	for i, row := range rows {
		if row == nil {
			requests[i] = &resourcepb.ReadRequest{}
			continue
		}
		requests[i] = &resourcepb.ReadRequest{
			Key:             row.Key,
			ResourceVersion: row.ResourceVersion,
		}
	}

	values, err := s.backend.BatchReadResource(ctx, requests)
	if err == nil {
		if len(values) != len(rows) {
			return nil, true, fmt.Errorf("batch resource reader returned %d responses for %d requests", len(values), len(rows))
		}
		return values, true, nil
	}
	if !errors.Is(err, ErrBatchReadUnsupported) {
		return nil, true, err
	}

	// No batched read: read each resource on its own. Read applies its own authz,
	// so the caller does not re-check these rows.
	values = make([]*BackendReadResponse, len(rows))
	for i, row := range rows {
		val, err := s.Read(ctx, &resourcepb.ReadRequest{
			Key:             row.Key,
			ResourceVersion: row.ResourceVersion,
		})
		if val == nil {
			values[i] = &BackendReadResponse{Error: AsErrorResult(err)}
			continue
		}
		values[i] = &BackendReadResponse{
			Key:             row.Key,
			ResourceVersion: val.ResourceVersion,
			Value:           val.Value,
			Error:           val.Error,
		}
	}
	return values, false, nil
}

// authorizeSearchRows checks a chunk of rows in one BatchCheck (further split by
// MaxBatchCheckItems), returning one allow/deny per row. Rows with no body or a
// read error are left denied; the caller handles those before consulting this.
func (s *server) authorizeSearchRows(ctx context.Context, req *resourcepb.ListRequest, rows []*resourcepb.ResourceTableRow, values []*BackendReadResponse) ([]bool, error) {
	user, ok := claims.AuthInfoFrom(ctx)
	if !ok || user == nil {
		return nil, fmt.Errorf("no user found in context")
	}

	allowed := make([]bool, len(rows))
	checks := make([]claims.BatchCheckItem, 0, len(rows))
	indices := make([]int, 0, len(rows))
	for i, row := range rows {
		if values[i] == nil || values[i].Error != nil {
			continue
		}
		name := ""
		if row != nil && row.Key != nil {
			name = row.Key.Name
		}
		checks = append(checks, claims.BatchCheckItem{
			CorrelationID:      strconv.Itoa(i),
			Verb:               utils.VerbGet,
			Group:              req.Options.Key.Group,
			Resource:           req.Options.Key.Resource,
			Name:               name,
			Folder:             values[i].Folder,
			FreshnessTimestamp: ResourceVersionTime(values[i].ResourceVersion),
		})
		indices = append(indices, i)
	}

	for start := 0; start < len(checks); start += claims.MaxBatchCheckItems {
		end := min(start+claims.MaxBatchCheckItems, len(checks))
		batchResp, err := s.access.BatchCheck(ctx, user, claims.BatchCheckRequest{
			Namespace: req.Options.Key.Namespace,
			Checks:    checks[start:end],
		})
		if err != nil {
			if AsErrorResult(err).Code == http.StatusForbidden {
				continue
			}
			return nil, err
		}
		for j := start; j < end; j++ {
			result, exists := batchResp.Results[checks[j].CorrelationID]
			if !exists {
				continue
			}
			if result.Error != nil {
				if AsErrorResult(result.Error).Code == http.StatusForbidden {
					continue
				}
				return nil, result.Error
			}
			if result.Allowed {
				allowed[indices[j]] = true
			}
		}
	}
	return allowed, nil
}

// tokenFromOtherListPath reports whether a continue token was issued by the other
// list path. The two encode a position differently, sort values against the index
// and a name against the store, so continuing with the wrong one would silently
// restart from the first result.
func tokenFromOtherListPath(token *ContinueToken, searchPath bool) bool {
	if searchPath {
		return token.Name != "" || token.Namespace != ""
	}
	return len(token.SearchAfter) > 0 || len(token.SearchBefore) > 0
}

// filterSelectors drops the requirements the index cannot answer, so a request
// carrying one of them is still served rather than refused. Callers re-apply the
// selector to the returned objects, so a dropped requirement costs extra reads
// rather than correctness.
func filterSelectors(req *resourcepb.ListRequest) *resourcepb.ListRequest {
	fields := make([]*resourcepb.Requirement, 0, len(req.Options.Fields))
	for _, f := range req.Options.Fields {
		// metadata.namespace is already in the request key.
		if (f.Operator != "=" && f.Operator != "==") || f.Key == "metadata.namespace" {
			continue
		}
		fields = append(fields, f)
	}
	req.Options.Fields = fields

	labels := make([]*resourcepb.Requirement, 0, len(req.Options.Labels))
	for _, l := range req.Options.Labels {
		if !indexableSelectorOperator(l.Operator) {
			continue
		}
		labels = append(labels, l)
	}
	req.Options.Labels = labels

	return req
}

// indexableSelectorOperator reports whether requirementQuery can turn the operator
// into an index query. A label selector may also carry !=, key and !key.
func indexableSelectorOperator(op string) bool {
	switch selection.Operator(op) {
	case selection.Equals, selection.DoubleEquals, selection.In, selection.NotIn:
		return true
	default:
		return false
	}
}

type SearchBackedListConfig struct {
	AllowedResources map[string]bool
}

func (c SearchBackedListConfig) Allowed(group, resource string) bool {
	return c.AllowedResources[group+"/"+resource]
}

func (s *server) shouldUseSearchForList(req *resourcepb.ListRequest) bool {
	if (s.searchClient == nil && s.search == nil) || req.Source != resourcepb.ListRequest_STORE {
		return false
	}
	if req.KeysOnly {
		return false
	}
	// An index covers one namespace, so a cross-namespace list stays on the store
	// scan, which supports it.
	if req.Options.Key.Namespace == "" {
		return false
	}
	// Search indexes collections and does not apply a name filter.
	if req.Options.Key.Name != "" {
		return false
	}
	hasSelectors := len(req.Options.Fields) > 0 || len(req.Options.Labels) > 0
	if !hasSelectors && !s.searchBackedListResources.Allowed(req.Options.Key.Group, req.Options.Key.Resource) {
		return false
	}

	if req.ResourceVersion > 0 || req.VersionMatchV2 == resourcepb.ResourceVersionMatchV2_Exact || req.VersionMatchV2 == resourcepb.ResourceVersionMatchV2_NotOlderThan {
		return false
	}

	// TODO have a way of including enterprise manifests
	manifests := AppManifestsWithKinds(AppManifests()...)
	return slices.ContainsFunc(manifests, func(m *app.ManifestData) bool {
		return m.Group == req.Options.Key.Group
	})
}
