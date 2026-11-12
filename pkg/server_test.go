package server

import (
	"bytes"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type httpClientConfig struct {
	CertFile       string
	PrivateKeyFile string
	TLSConfig      *tls.Config
	HTTPTransport  *http.Transport
}

const (
	testHostname = "127.0.0.1"
)

func TestServerRunning(t *testing.T) {
	testPort, err := getFreePort(testHostname)
	if err != nil {
		t.Fatalf("Cannot get a free port to run tests on host [%v]", testHostname)
	} else {
		t.Logf("Will use free port [%v] on host [%v] for tests", testPort, testHostname)
	}

	testServerHostPort := fmt.Sprintf("%v:%v", testHostname, testPort)

	serverURL := fmt.Sprintf("http://%s", testServerHostPort)

	// Prepare directory to serve web files
	tmpDir := prepareServerAssets(t)
	defer os.RemoveAll(tmpDir)

	go func() {
		Start(&Config{
			Port: testPort,
		})
	}()

	t.Logf("Started test http server: %v", serverURL)

	httpConfig := httpClientConfig{}
	httpClient, err := httpConfig.buildHTTPClient()
	if err != nil {
		t.Fatalf("Failed to create http client")
	}

	// wait for our test http server to come up
	checkHTTPReady(httpClient, serverURL)

	if _, err = getRequestResults(t, httpClient, serverURL); err != nil {
		t.Fatalf("Failed: could not fetch static files on / (root): %v", err)
	}

	if _, err = getRequestResults(t, httpClient, serverURL+"/health"); err != nil {
		t.Fatalf("Failed: could not fetch health check: %v", err)
	}

	if _, err = getRequestResults(t, httpClient, serverURL+"/features"); err != nil {
		t.Fatalf("Failed: could not fetch features endpoint: %v", err)
	}

	// sanity check - make sure we cannot get to a bogus context path
	if _, err = getRequestResults(t, httpClient, serverURL+"/badroot"); err == nil {
		t.Fatalf("Failed: Should have failed going to /badroot")
	}
}

func TestSecureServerRunning(t *testing.T) {
	testPort, err := getFreePort(testHostname)
	if err != nil {
		t.Fatalf("Cannot get a free port to run tests on host [%v]", testHostname)
	} else {
		t.Logf("Will use free port [%v] on host [%v] for tests", testPort, testHostname)
	}
	testMetricsPort, err := getFreePort(testHostname)
	if err != nil {
		t.Fatalf("Cannot get a free metrics port to run tests on host [%v]", testHostname)
	} else {
		t.Logf("Will use free metrics port [%v] on host [%v] for tests", testMetricsPort, testHostname)
	}

	tmpDir, err := os.MkdirTemp("", "server-test")
	require.NoError(t, err)
	defer os.RemoveAll(tmpDir)

	testServerCertFile := tmpDir + "/server-test-server.cert"
	testServerKeyFile := tmpDir + "/server-test-server.key"
	testServerHostPort := fmt.Sprintf("%v:%v", testHostname, testPort)
	err = generateCertificate(t, testServerCertFile, testServerKeyFile, testServerHostPort)
	if err != nil {
		t.Fatalf("Failed to create server cert/key files: %v", err)
	}
	defer os.Remove(testServerCertFile)
	defer os.Remove(testServerKeyFile)

	testClientCertFile := tmpDir + "/server-test-client.cert"
	testClientKeyFile := tmpDir + "/server-test-client.key"
	testClientHost := testHostname
	err = generateCertificate(t, testClientCertFile, testClientKeyFile, testClientHost)
	if err != nil {
		t.Fatalf("Failed to create client cert/key files: %v", err)
	}
	defer os.Remove(testClientCertFile)
	defer os.Remove(testClientKeyFile)

	conf := &Config{
		CertFile:       testServerCertFile,
		PrivateKeyFile: testServerKeyFile,
		Port:           testPort,
	}

	serverURL := fmt.Sprintf("https://%s", testServerHostPort)

	// Prepare directory to serve web files
	tmpDirAssets := prepareServerAssets(t)
	defer os.RemoveAll(tmpDirAssets)

	go func() {
		Start(conf)
	}()
	t.Logf("Started test http server: %v", serverURL)

	httpConfig := httpClientConfig{
		CertFile:       testClientCertFile,
		PrivateKeyFile: testClientKeyFile,
		TLSConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	httpClient, err := httpConfig.buildHTTPClient()
	if err != nil {
		t.Fatalf("Failed to create http client")
	}

	// Wait for our test http server to come up
	checkHTTPReady(httpClient, serverURL+"/status")

	if _, err = getRequestResults(t, httpClient, serverURL); err != nil {
		t.Fatalf("Failed: could not fetch static files on / (root): %v", err)
	}

	if _, err = getRequestResults(t, httpClient, serverURL+"/health"); err != nil {
		t.Fatalf("Failed: could not fetch API endpoint: %v", err)
	}

	// Make sure the server rejects anything trying to use TLS 1.1 or under
	httpConfigTLS11 := httpClientConfig{
		CertFile:       testClientCertFile,
		PrivateKeyFile: testClientKeyFile,
		TLSConfig: &tls.Config{
			InsecureSkipVerify: true,
			MinVersion:         tls.VersionTLS10,
			MaxVersion:         tls.VersionTLS11,
		},
	}
	httpClientTLS11, err := httpConfigTLS11.buildHTTPClient()
	if err != nil {
		t.Fatalf("Failed to create http client with TLS 1.1")
	}
	if _, err = getRequestResults(t, httpClientTLS11, serverURL); err == nil {
		t.Fatalf("Failed: should not have been able to use TLS 1.1")
	}
}

func getFreePort(host string) (int, error) {
	addr, err := net.ResolveTCPAddr("tcp", host+":0")
	if err != nil {
		return 0, err
	}

	l, err := net.ListenTCP("tcp", addr)
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port, nil
}

func prepareServerAssets(t *testing.T) string {
	tmpDir, err := os.MkdirTemp("", "server-test")
	require.NoError(t, err)
	distpath := filepath.Join(tmpDir, "web/dist")
	err = os.MkdirAll(distpath, os.ModePerm)
	require.NoError(t, err)
	dummyfile := filepath.Join(distpath, "dummy")
	_, err = os.Create(dummyfile)
	require.NoError(t, err)
	// t.Chdir restores the working directory when the test ends, so tests
	// that rely on relative paths (e.g. testdata) are not affected.
	t.Chdir(tmpDir)
	return tmpDir
}

func getRequestResults(t *testing.T, httpClient *http.Client, url string) (string, error) {
	r, err := http.NewRequest("GET", url, nil)
	if err != nil {
		t.Fatal(err)
		return "", err
	}

	resp, err := httpClient.Do(r)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		buf := new(bytes.Buffer)
		_, err2 := buf.ReadFrom(resp.Body)
		if err2 != nil {
			return "", err2
		}
		bodyString := buf.String()
		return bodyString, nil
	}
	return "", fmt.Errorf("Bad status: %v", resp.StatusCode)
}

func checkHTTPReady(httpClient *http.Client, url string) {
	for i := 0; i < 60; i++ {
		if r, err := httpClient.Get(url); err == nil {
			r.Body.Close()
			break
		} else {
			time.Sleep(time.Second)
		}
	}
}

func (conf *httpClientConfig) buildHTTPClient() (*http.Client, error) {
	// Make our own copy of TLS config
	tlsConfig := &tls.Config{}
	if conf.TLSConfig != nil {
		tlsConfig = conf.TLSConfig
	}

	if conf.CertFile != "" {
		cert, err := tls.LoadX509KeyPair(conf.CertFile, conf.PrivateKeyFile)
		if err != nil {
			return nil, fmt.Errorf("Error loading the client certificates: %w", err)
		}
		tlsConfig.Certificates = append(tlsConfig.Certificates, cert)
	}

	// Make our own copy of HTTP transport
	transport := &http.Transport{}
	if conf.HTTPTransport != nil {
		transport = conf.HTTPTransport
	}

	// Make sure the transport has some things we know we need
	transport.TLSClientConfig = tlsConfig

	if transport.IdleConnTimeout == 0 {
		transport.IdleConnTimeout = time.Second * 600
	}
	if transport.ResponseHeaderTimeout == 0 {
		transport.ResponseHeaderTimeout = time.Second * 600
	}

	// Build the http client
	httpClient := http.Client{Transport: transport}

	return &httpClient, nil
}

func generateCertificate(t *testing.T, certPath string, keyPath string, host string) error {
	priv, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return err
	}

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return err
	}

	notBefore := time.Now()
	notAfter := notBefore.Add(365 * 24 * time.Hour)

	template := x509.Certificate{
		SerialNumber:          serialNumber,
		NotBefore:             notBefore,
		NotAfter:              notAfter,
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		Subject: pkix.Name{
			Organization: []string{"ABC Corp."},
		},
	}

	hosts := strings.Split(host, ",")
	for _, h := range hosts {
		if ip := net.ParseIP(h); ip != nil {
			template.IPAddresses = append(template.IPAddresses, ip)
		} else {
			template.DNSNames = append(template.DNSNames, h)
		}
	}

	template.IsCA = true
	template.KeyUsage |= x509.KeyUsageCertSign

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return err
	}

	certOut, err := os.Create(certPath)
	if err != nil {
		return err
	}
	_ = pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	certOut.Close()

	keyOut, err := os.OpenFile(keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}

	pemBlockForKey := &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(priv)}
	_ = pem.Encode(keyOut, pemBlockForKey)
	keyOut.Close()

	t.Logf("Generated security data: %v|%v|%v", certPath, keyPath, host)
	return nil
}

func TestFilesHandler(t *testing.T) {
	fs := http.Dir("testdata")
	handler := filesHandler(fs)

	req := httptest.NewRequest("GET", "/index.html", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	res := w.Result()
	if res.Header.Get("Cache-Control") != "" {
		t.Errorf("Expected no Cache-Control header, but got %q", res.Header.Get("Cache-Control"))
	}
	if res.Header.Get("Expires") != "" {
		t.Errorf("Expected no Expires header, but got %q", res.Header.Get("Expires"))
	}

	req = httptest.NewRequest("GET", "/plugin-entry.js", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	res = w.Result()
	if res.Header.Get("Cache-Control") != "no-cache, no-store, must-revalidate" {
		t.Errorf("Expected Cache-Control header %q, but got %q", "no-cache, no-store, must-revalidate", res.Header.Get("Cache-Control"))
	}
	if res.Header.Get("Expires") != "0" {
		t.Errorf("Expected Expires header %q, but got %q", "0", res.Header.Get("Expires"))
	}
}

// startSecureTestServer starts Start(conf) over TLS in the background, filling
// in conf's Port and cert files, and returns its URL once /health answers.
// Like TestSecureServerRunning, the server keeps running until the test
// binary exits, since Start never returns.
func startSecureTestServer(t *testing.T, conf *Config) string {
	t.Helper()

	testPort, err := getFreePort(testHostname)
	require.NoError(t, err)

	tmpDir := t.TempDir()
	conf.Port = testPort
	conf.CertFile = filepath.Join(tmpDir, "server.cert")
	conf.PrivateKeyFile = filepath.Join(tmpDir, "server.key")
	require.NoError(t, generateCertificate(t, conf.CertFile, conf.PrivateKeyFile, testHostname))

	tmpDirAssets := prepareServerAssets(t)
	t.Cleanup(func() {
		if err := os.RemoveAll(tmpDirAssets); err != nil {
			t.Errorf("failed to remove test assets %q: %v", tmpDirAssets, err)
		}
	})

	go Start(conf)

	serverURL := fmt.Sprintf("https://%s:%d", testHostname, testPort)
	readyClient := newInsecureTestClient(t, &tls.Config{})
	require.Eventually(t, func() bool {
		_, err := getRequestResults(t, readyClient, serverURL+"/health")
		return err == nil
	}, 10*time.Second, 50*time.Millisecond, "test https server did not become ready")
	t.Logf("Started test https server: %v", serverURL)

	return serverURL
}

// newInsecureTestClient returns a client using a copy of tlsConfig with
// InsecureSkipVerify.
func newInsecureTestClient(t *testing.T, tlsConfig *tls.Config) *http.Client {
	t.Helper()

	tlsConfig = tlsConfig.Clone()
	tlsConfig.InsecureSkipVerify = true
	httpClient, err := (&httpClientConfig{TLSConfig: tlsConfig}).buildHTTPClient()
	require.NoError(t, err)

	return httpClient
}

func TestTLSConfigWithCurvePreferences(t *testing.T) {
	serverURL := startSecureTestServer(t, &Config{
		TLSCurvePreferences: []tls.CurveID{tls.CurveP384},
	})
	healthURL := serverURL + "/health"

	for _, version := range []uint16{tls.VersionTLS12, tls.VersionTLS13} {
		t.Run(tls.VersionName(version), func(t *testing.T) {
			httpClientP384 := newInsecureTestClient(t, &tls.Config{
				MinVersion:       version,
				MaxVersion:       version,
				CurvePreferences: []tls.CurveID{tls.CurveP384},
			})
			_, err := getRequestResults(t, httpClientP384, healthURL)
			require.NoError(t, err, "could not connect with allowed curve CurveP384")

			httpClientX25519 := newInsecureTestClient(t, &tls.Config{
				MinVersion:       version,
				MaxVersion:       version,
				CurvePreferences: []tls.CurveID{tls.X25519},
			})
			// Must be a handshake rejection, not an unrelated failure.
			_, err = getRequestResults(t, httpClientX25519, healthURL)
			require.ErrorContains(t, err, "tls: handshake failure")
		})
	}
}

func TestTLSConfigWithMaxVersion(t *testing.T) {
	serverURL := startSecureTestServer(t, &Config{
		TLSMaxVersion: tls.VersionTLS12,
	})
	healthURL := serverURL + "/health"

	httpClientTLS12 := newInsecureTestClient(t, &tls.Config{
		MinVersion: tls.VersionTLS12,
		MaxVersion: tls.VersionTLS12,
	})
	_, err := getRequestResults(t, httpClientTLS12, healthURL)
	require.NoError(t, err, "could not connect with TLS 1.2")

	httpClientTLS13 := newInsecureTestClient(t, &tls.Config{
		MinVersion: tls.VersionTLS13,
	})
	_, err = getRequestResults(t, httpClientTLS13, healthURL)
	require.ErrorContains(t, err, "protocol version not supported")
}
