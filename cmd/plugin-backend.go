package main

import (
	"crypto/tls"
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
	tlsCipherSuitesArg = flag.String("tls-cipher-suites", "", "comma-separated list of cipher suites for TLS 1.0-1.2 (ignored for TLS 1.3)")
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
	tlsCipherSuites := mergeEnvValue("TLS_CIPHER_SUITES", *tlsCipherSuitesArg, "")
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

	tlsCipherSuitesList, err := parseCipherSuites(tlsCipherSuites)
	if err != nil {
		log.WithError(err).Fatal("Invalid TLS cipher suites")
	}

	server.Start(&server.Config{
		Port:            port,
		CertFile:        cert,
		PrivateKeyFile:  key,
		TLSMinVersion:   tlsMinVer,
		TLSCipherSuites: tlsCipherSuitesList,
		Features:        featuresSet,
		StaticPath:      staticPath,
		ConfigPath:      configPath,
		PluginConfigPath: pluginConfigPath,
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
	if err != nil && num != 0 {
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

func parseCipherSuites(cipherSuitesStr string) ([]uint16, error) {
	if cipherSuitesStr == "" {
		return nil, nil
	}

	cipherSuiteNames := strings.Split(cipherSuitesStr, ",")
	// Trim whitespace from each cipher suite name
	trimmed := make([]string, 0, len(cipherSuiteNames))
	for _, name := range cipherSuiteNames {
		if t := strings.TrimSpace(name); t != "" {
			trimmed = append(trimmed, t)
		}
	}
	if len(trimmed) == 0 {
		return nil, nil
	}
	return k8sapiflag.TLSCipherSuites(trimmed)
}
