package controllers

import (
	"context"
	"net/http"

	"github.com/compuzest/zlifecycle-event-service/app/apm"
	"github.com/compuzest/zlifecycle-event-service/app/health"
	"github.com/compuzest/zlifecycle-event-service/app/services"
	http2 "github.com/compuzest/zlifecycle-event-service/app/web/http"
	"github.com/compuzest/zlifecycle-event-service/app/zlog"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/sirupsen/logrus"
)

func HealthHandler(svcs *services.Services, fullCheck bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		txn := newrelic.FromContext(r.Context())
		log := zlog.CtxLogger(r.Context())
		var err error
		var resp any
		var statusCode int
		switch r.Method {
		case http.MethodGet:
			hc := getHealthHandler(r.Context(), svcs, fullCheck, log)
			statusCode = hc.Code
			resp = hc
		default:
			err := apm.NoticeError(txn, http2.NewNotFoundError(r))
			http2.WriteNotFoundError(err, w, log)
			return
		}
		if err != nil {
			verr := apm.NoticeError(txn, http2.NewVerboseError("HealthError", r, err))
			http2.WriteInternalError(w, verr, r, log)
			return
		}

		http2.WriteResponse(w, resp, statusCode)
	}
}

func getHealthHandler(ctx context.Context, svcs *services.Services, fullCheck bool, log *logrus.Entry) *GetHealthResponse {
	hc := svcs.SS.Healthcheck(ctx, fullCheck, log)

	return &GetHealthResponse{*hc}
}

type GetHealthResponse struct {
	health.Healthcheck
}
