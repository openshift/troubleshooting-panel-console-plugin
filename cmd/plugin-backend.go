package main

import (
	"crypto/tls"
	"errors"
	"flag"
	"fmt"
	"os"
	"strconv"
	"strings"

	server "github.com/openshift/troubleshooting-panel-console-plugin/pkg"
	"github.com/sirupsen/logrus"
	k8sapiflag "k8s.io/component-base/cli/flag"
)

var (
	portArg            = flag.Int("port", 0, "server port to listen on (default: 9443)")
	certArg            = flag.String("cert", "", "cert file path to enable TLS (disabled by default)")
	keyArg             = flag.String("key", "", "private key file path to enable TLS (disabled by default)")
	tlsMinVersionArg   = flag.String("tls-min-version", "", "minimum TLS version (e.g., VersionTLS12, VersionTLS13)")
	tlsMaxVersionArg   = flag.String("tls-max-version", "", "maximum TLS version\noptions: ['VersionTLS12', 'VersionTLS13']\n(default is the highest supported by Go)")
	tlsCipherSuitesArg = flag.String("tls-cipher-suites", "", "comma-separated list of cipher suites for TLS 1.0-1.2 (ignored for TLS 1.3)")
	tlsCurvesArg       = flag.String("tls-curves", "", "comma-separated list of TLS curves for the server\nvalues are tls.CurveID names (https://pkg.go.dev/crypto/tls#CurveID) or OpenShift TLS group names")
	featuresArg        = flag.String("features", "", "enabled features, comma separated")
	staticPathArg      = flag.String("static-path", "", "static files path to serve frontend (default: './web/dist')")
	configPathArg      = flag.String("config-path", "", "config files path (default: './config')")
	pluginConfigArg    = flag.String("plugin-config-path", "", "plugin yaml configuration")
	logLevelArg        = flag.String("log-level", logrus.InfoLevel.String(), "verbosity of logs\noptions: ['panic', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']\n'trace' level will log all incoming requests\n(default 'error')")
	log                = logrus.WithField("module", "main")
)

func main() {
	flag.Parse()

	port := mergeEnvValueInt("PORT", *portArg, 9443)
	cert := mergeEnvValue("CERT_FILE_PATH", *certArg, "")
	key := mergeEnvValue("PRIVATE_KEY_FILE_PATH", *keyArg, "")
	tlsMinVersion := mergeEnvValue("TLS_MIN_VERSION", *tlsMinVersionArg, "")
	tlsMaxVersion := mergeEnvValue("TLS_MAX_VERSION", *tlsMaxVersionArg, "")
	tlsCipherSuites := mergeEnvValue("TLS_CIPHER_SUITES", *tlsCipherSuitesArg, "")
	tlsCurves := mergeEnvValue("TLS_CURVES", *tlsCurvesArg, "")
	features := mergeEnvValue("TROUBLESHOOTING_PANEL_CONSOLE_PLUGIN_FEATURES", *featuresArg, "")
	staticPath := mergeEnvValue("TROUBLESHOOTING_PANEL_CONSOLE_PLUGIN_STATIC_PATH", *staticPathArg, "opt/app-root/web/dist")
	configPath := mergeEnvValue("TROUBLESHOOTING_PANEL_CONSOLE_PLUGIN_MANIFEST_CONFIG_PATH", *configPathArg, "opt/app-root/web/dist")
	pluginConfigPath := mergeEnvValue("TROUBLESHOOTING_PANEL_CONSOLE_PLUGIN_CONFIG_PATH", *pluginConfigArg, "/etc/plugin/config.yaml")
	logLevel := mergeEnvValue("TROUBLESHOOTING_PANEL_CONSOLE_PLUGIN_LOG_LEVEL", *logLevelArg, logrus.InfoLevel.String())
	featuresList := strings.Fields(strings.Join(strings.Split(strings.ToLower(features), ","), " "))

	featuresSet := make(map[string]bool)
	for _, s := range featuresList {
		featuresSet[s] = true
	}

	logrusLevel, err := logrus.ParseLevel(logLevel)
	if err != nil {
		logrusLevel = logrus.ErrorLevel
		logrus.WithError(err).Warnf("Invalid log level. Defaulting to %q", logrusLevel.String())
	}
	logrus.SetLevel(logrusLevel)

	log.Infof("enabled features: %+q\n", featuresList)

	tlsMinVer, err := parseTLSVersion(tlsMinVersion)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS minimum version")
	}

	tlsMaxVer, err := parseTLSMaxVersion(tlsMaxVersion)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS maximum version")
	}
	if tlsMaxVer != 0 {
		log.Infof("Max TLS version: %q", tls.VersionName(tlsMaxVer))
	}

	tlsCipherSuitesList, err := server.ParseCipherSuites(tlsCipherSuites)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS cipher suites")
	}
	if len(tlsCipherSuitesList) > 0 {
		log.Infof("TLS ciphers: %q", server.CipherSuiteNames(tlsCipherSuitesList))
	}

	tlsCurvePrefs, err := server.ParseCurves(tlsCurves)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS curves")
	}
	if len(tlsCurvePrefs) > 0 {
		log.Infof("TLS curves: %q", tlsCurvePrefs)
	}

	server.Start(&server.Config{
		Port:                port,
		CertFile:            cert,
		PrivateKeyFile:      key,
		TLSMinVersion:       tlsMinVer,
		TLSMaxVersion:       tlsMaxVer,
		TLSCipherSuites:     tlsCipherSuitesList,
		TLSCurvePreferences: tlsCurvePrefs,
		Features:            featuresSet,
		StaticPath:          staticPath,
		ConfigPath:          configPath,
		PluginConfigPath:    pluginConfigPath,
	})
}

func mergeEnvValue(key string, arg string, defaultValue string) string {
	if arg != "" {
		return arg
	}

	envValue := os.Getenv(key)

	if envValue != "" {
		return envValue
	}

	return defaultValue
}

func mergeEnvValueInt(key string, arg int, defaultValue int) int {
	if arg != 0 {
		return arg
	}

	envValue := os.Getenv(key)

	num, err := strconv.Atoi(envValue)
	if err == nil && num != 0 {
		return num
	}

	return defaultValue
}

func parseTLSVersion(version string) (uint16, error) {
	if version == "" {
		return 0, nil
	}
	tlsVersion, err := k8sapiflag.TLSVersion(version)
	if err != nil {
		return 0, err
	}
	// Reject TLS 1.0 and 1.1 as they are deprecated per RFC 8996
	if tlsVersion != 0 && tlsVersion < tls.VersionTLS12 {
		return 0, fmt.Errorf("TLS versions below 1.2 are not supported (got %s); minimum allowed is VersionTLS12", version)
	}
	return tlsVersion, nil
}

// parseTLSMaxVersion parses the max version with the same rules as the min
// version. Its error lists the valid values instead of echoing the input.
func parseTLSMaxVersion(version string) (uint16, error) {
	tlsVersion, err := parseTLSVersion(version)
	if err != nil {
		return 0, errors.New("invalid TLS maximum version, valid values: VersionTLS12, VersionTLS13")
	}
	return tlsVersion, nil
}
