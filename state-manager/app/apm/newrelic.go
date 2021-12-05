package apm

import (
	"github.com/newrelic/go-agent/v3/newrelic"
	"os"
)

func Init() (*newrelic.Application, error) {
	license := os.Getenv("NEW_RELIC_API_KEY")
	app, err := newrelic.NewApplication(
		newrelic.ConfigAppName("zlifecycle-state-manager"),
		newrelic.ConfigLicense(license),
		newrelic.ConfigDistributedTracerEnabled(true),
	)
	if err != nil {
		return nil, err
	}

	return app, nil
}
