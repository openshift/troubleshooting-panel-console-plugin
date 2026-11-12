package main

import (
	"crypto/tls"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestParseTLSMaxVersion(t *testing.T) {
	version, err := parseTLSMaxVersion("")
	require.NoError(t, err)
	require.Zero(t, version, "empty max version keeps the Go default")

	version, err = parseTLSMaxVersion("VersionTLS12")
	require.NoError(t, err)
	require.Equal(t, uint16(tls.VersionTLS12), version)

	version, err = parseTLSMaxVersion("VersionTLS13")
	require.NoError(t, err)
	require.Equal(t, uint16(tls.VersionTLS13), version)

	for _, input := range []string{"NotAVersion", "VersionTLS11"} {
		t.Run(input, func(t *testing.T) {
			_, err := parseTLSMaxVersion(input)
			require.EqualError(t, err, "invalid TLS maximum version, valid values: VersionTLS12, VersionTLS13")
			require.NotContains(t, err.Error(), input)
		})
	}
}

func TestMergeEnvValueInt(t *testing.T) {
	t.Setenv("TEST_MERGE_PORT", "8443")
	require.Equal(t, 8443, mergeEnvValueInt("TEST_MERGE_PORT", 0, 9443), "env value is used when the flag is unset")
	require.Equal(t, 7443, mergeEnvValueInt("TEST_MERGE_PORT", 7443, 9443), "flag value wins over env")

	t.Setenv("TEST_MERGE_PORT", "")
	require.Equal(t, 9443, mergeEnvValueInt("TEST_MERGE_PORT", 0, 9443), "default is used when env is unset")

	t.Setenv("TEST_MERGE_PORT", "not-a-number")
	require.Equal(t, 9443, mergeEnvValueInt("TEST_MERGE_PORT", 0, 9443), "default is used when env is invalid")
}
