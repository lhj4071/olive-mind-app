const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite 웹 지원: .wasm 파일을 정적 에셋으로 처리
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer 활성화에 필요한 CORS 헤더 (wa-sqlite 요구사항)
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const base = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(middleware)
      : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      base(req, res, next);
    };
  },
};

module.exports = config;
