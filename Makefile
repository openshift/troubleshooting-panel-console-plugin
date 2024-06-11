.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci

.PHONY: install-frontend-ci-clean
install-frontend-ci-clean: install-frontend-ci
	cd web && npm cache clean --force

.PHONY: build-frontend
build-frontend:
	cd web && npm run build

.PHONY: start-frontend
start-frontend:
	cd web && npm run start

.PHONY: start-console
start-console:
	./scripts/start-console.sh

.PHONY: lint-frontend
lint-frontend:
	cd web && npm run lint

.PHONY: build-backend
build-backend:
	go build -o plugin-backend cmd/plugin-backend.go

.PHONY: start-backend
start-backend:
	go run ./cmd/plugin-backend.go -port='9002' -config-path='./web/dist' -static-path='./web/dist' -plugin-config-path='ct.yaml'

.PHONY: build-image
build-image:
	./scripts/build-image.sh

.PHONY: start-forward
start-forward:
	./scripts/start-forward.sh

export REGISTRY_ORG?=openshift-observability-ui
export TAG?=latest
IMAGE=quay.io/${REGISTRY_ORG}/troubleshooting-panel-console-plugin:${TAG}

.PHONY: deploy
deploy:				## Build and push image, deploy to cluster using help.
	PUSH=1 scripts/build-image.sh
	helm upgrade -i troubleshooting-panel-console-plugin charts/openshift-console-plugin -n troubleshooting-panel-console-plugin --create-namespace --set plugin.image=$(IMAGE)
