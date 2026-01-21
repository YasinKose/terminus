# Terminus Geliştirme Komutları

# Varsayılan hedef: Yardım mesajını göster
.DEFAULT_GOAL := help

.PHONY: help dev build tauri-dev clean

help: ## Kullanılabilir komutları listeler
	@echo "Kullanılabilir komutlar:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Proje bağımlılıklarını yükler (npm install)
	npm install

dev: ## Sadece web arayüzünü (Vite) tarayıcıda çalıştırır
	npm run dev

tauri-dev: ## Masaüstü uygulamasını geliştirme modunda başlatır (Tauri + Vite)
	npm run tauri dev

build: ## Uygulamanın production sürümünü derler
	npm run tauri build

clean: ## Derleme çıktılarını ve önbellekleri temizler
	rm -rf dist src-tauri/target
