package main

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/assert"
	k8sapiflag "k8s.io/component-base/cli/flag"
)

func TestParseCipherSuites(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expected    []uint16
		expectError bool
	}{
		{
			name:        "Empty string returns nil",
			input:       "",
			expected:    nil,
			expectError: false,
		},
		{
			name:        "Single valid cipher suite",
			input:       "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
			expected:    []uint16{tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256},
			expectError: false,
		},
		{
			name:  "Multiple valid cipher suites",
			input: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
			expected: []uint16{
				tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			},
			expectError: false,
		},
		{
			name:  "Valid cipher suites with spaces",
			input: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256, TLS_AES_128_GCM_SHA256",
			expected: []uint16{
				tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_AES_128_GCM_SHA256,
			},
			expectError: false,
		},
		{
			name:        "Invalid cipher suite",
			input:       "INVALID_CIPHER",
			expected:    nil,
			expectError: true,
		},
		{
			name:        "Mixed valid and invalid",
			input:       "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,INVALID_CIPHER",
			expected:    nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseCipherSuites(tt.input)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

// TestParseOldTLSProfile ensures the backend accepts the settings COO passes
// when the cluster APIServer uses the "Old" TLS security profile.
func TestParseOldTLSProfile(t *testing.T) {
	minVersion, err := k8sapiflag.TLSVersion("VersionTLS10")
	assert.NoError(t, err)
	assert.Equal(t, uint16(tls.VersionTLS10), minVersion)

	oldProfileCiphers := "TLS_AES_128_GCM_SHA256,TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256," +
		"TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256," +
		"TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384," +
		"TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256,TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256," +
		"TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256," +
		"TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA," +
		"TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA," +
		"TLS_RSA_WITH_AES_128_GCM_SHA256,TLS_RSA_WITH_AES_256_GCM_SHA384," +
		"TLS_RSA_WITH_AES_128_CBC_SHA256,TLS_RSA_WITH_AES_128_CBC_SHA,TLS_RSA_WITH_AES_256_CBC_SHA," +
		"TLS_RSA_WITH_3DES_EDE_CBC_SHA"
	suites, err := parseCipherSuites(oldProfileCiphers)
	assert.NoError(t, err)
	assert.Len(t, suites, 21)
}
