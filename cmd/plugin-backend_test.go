package main

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseTLSVersion(t *testing.T) {
	tests := []struct {
		name        string
		version     string
		expected    uint16
		expectError bool
	}{
		{
			name:        "Empty string returns 0",
			version:     "",
			expected:    0,
			expectError: false,
		},
		{
			name:        "Valid TLS 1.2",
			version:     "VersionTLS12",
			expected:    tls.VersionTLS12,
			expectError: false,
		},
		{
			name:        "Valid TLS 1.3",
			version:     "VersionTLS13",
			expected:    tls.VersionTLS13,
			expectError: false,
		},
		{
			name:        "Invalid version",
			version:     "InvalidVersion",
			expected:    0,
			expectError: true,
		},
		{
			name:        "TLS 1.0 rejected",
			version:     "VersionTLS10",
			expected:    0,
			expectError: true,
		},
		{
			name:        "TLS 1.1 rejected",
			version:     "VersionTLS11",
			expected:    0,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseTLSVersion(tt.version)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

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
