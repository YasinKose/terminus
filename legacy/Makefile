# Terminus Geliştirme Komutları

.DEFAULT_GOAL := help

.PHONY: help dev build check clean install

help: ## Kullanılabilir komutları listeler
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Uygulamayı geliştirme modunda başlatır
	npm run tauri dev

build: ## Production sürümünü derler
	npm run tauri build

check: ## Tip kontrollerini çalıştırır
	npm run check

clean: ## Derleme çıktılarını temizler
	rm -rf dist src-tauri/target

install: ## Bağımlılıkları yükler
	npm install
