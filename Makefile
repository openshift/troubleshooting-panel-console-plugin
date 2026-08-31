
VERSION     ?= latest
PLATFORMS   ?= linux/arm64,linux/amd64
ORG         ?= openshift-observability-ui
IMAGE       ?= quay.io/${ORG}/troubleshooting-panel-console-plugin:${VERSION}
TAG         ?= $(VERSION)

.PHONY: all
all: build-frontend build-backend test-frontend

.PHONY: test
test: test-frontend

.PHONY: test-frontend
test-frontend: lint-frontend
	cd web && npm run test:unit

.PHONY: test-e2e
test-e2e:
	cd web && npm install && npm run test:e2e

.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci --ignore-scripts

.PHONY: install-frontend-ci-clean
install-frontend-ci-clean: install-frontend-ci
	cd web && npm cache clean --force

.PHONY: build-frontend
build-frontend: lint-frontend
	cd web && npm run i18n && npm run build

.PHONY: start-frontend
start-frontend:
	cd web && npm run start

.PHONY: start-console
start-console:
	./scripts/start-console.sh

.PHONY: lint-frontend
lint-frontend:
	cd web && npm run lint && npm run lint:tsc

.PHONY: install-backend
install-backend:
	go mod download

.PHONY: build-backend
build-backend:
	go build $(BUILD_OPTS) -o plugin-backend -mod=readonly cmd/plugin-backend.go

.PHONY: start-backend
start-backend:
	go run ./cmd/plugin-backend.go -port='9002' -config-path='./web/dist' -static-path='./web/dist' -plugin-config-path='ct.yaml'

.PHONY: install
install: install-frontend install-backend

.PHONY: build-image
build-image: build-frontend test-frontend
	TAG=$(TAG) ./scripts/build-image.sh

.PHONY: start-forward
start-forward:
	./scripts/start-forward.sh

.PHONY: deploy
deploy:	test-frontend		## Build and push image, reinstall on cluster using helm.
	helm uninstall troubleshooting-panel-console-plugin -n troubleshooting-panel-console-plugin || true
	PUSH=1 scripts/build-image.sh
	helm install troubleshooting-panel-console-plugin charts/openshift-console-plugin -n troubleshooting-panel-console-plugin --create-namespace --set plugin.image=${IMAGE}

HASH_CMD       := $(shell command -v sha256sum >/dev/null 2>&1 && echo sha256sum || echo "shasum -a 256")
DEVSPACE_TAG   ?= devspace-$(shell find Dockerfile.devspace Makefile go.mod go.sum cmd/ pkg/ web/package.json web/package-lock.json -type f -exec $(HASH_CMD) {} + 2>/dev/null | sort | $(HASH_CMD) | cut -c1-12)
DEVSPACE_IMAGE ?= quay.io/${ORG}/troubleshooting-panel-console-plugin:$(DEVSPACE_TAG)
.PHONY: build-devspace-image
build-devspace-image:
	podman build -f Dockerfile.devspace -t $(DEVSPACE_IMAGE) .
	podman push $(DEVSPACE_IMAGE)
	@mkdir -p .devspace
	@echo $(DEVSPACE_IMAGE) > .devspace/devimage

.PHONY: watch-frontend
watch-frontend:
	cd web && npx ts-node -O '{"module":"commonjs"}' node_modules/.bin/webpack --watch

.PHONY: start-devspace-backend
start-devspace-backend:
	/opt/app-root/plugin-backend -port=9443 -cert=/var/serving-cert/tls.crt -key=/var/serving-cert/tls.key -plugin-config-path=/etc/plugin/config.yaml -static-path=/opt/app-root/web/dist -config-path=/opt/app-root/web/dist $(if $(FEATURES),-features=$(FEATURES))

.PHONY: generate
generate: generate-client

.PHONY: generate-client
generate-client:
	cd web && npm run generate-client

.PHONY: podman-cross-build
podman-cross-build:
	podman manifest rm ${IMAGE} || true
	podman manifest create ${IMAGE}
	podman build --platform=${PLATFORMS} --manifest ${IMAGE} -f Dockerfile.dev
	podman manifest push ${IMAGE}
