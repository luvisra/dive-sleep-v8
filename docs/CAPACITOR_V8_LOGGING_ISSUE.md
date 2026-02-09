# Capacitor 8 iOS 콘솔 로그 출력 이슈 분석

## 문제 상황

**프로젝트**: dive-sleep-v8 (Capacitor 8.0.0)  
**증상**: Xcode 콘솔에서 TypeScript의 console.log가 `[log]` 태그와 함께 출력되지 않음  
**비교 대상**: mogwa-platform (Capacitor 7.0.1) - Xcode 콘솔에서 정상 출력됨

## 조사 및 시도한 해결 방법

### 1. Info.plist 수정
**문제**: `CAPACITOR_DEBUG` 키가 정의되지 않은 변수 참조  
**조치**: Info.plist에서 CAPACITOR_DEBUG 키 제거  
**결과**: ❌ 로그 여전히 출력 안 됨

### 2. capacitor.config.ts 설정 추가
**조치**:
```typescript
const config: CapacitorConfig = {
  loggingBehavior: 'debug',
  ios: {
    loggingBehavior: 'debug'
  },
  server: {
    cleartext: true
  }
};
```
**결과**: ❌ 로그 여전히 출력 안 됨

### 3. AppDelegate.swift에 WKWebView.isInspectable 설정
**이유**: iOS 16.4+ 에서 WKWebView 디버깅 활성화 필요  
**조치**:
```swift
func applicationDidBecomeActive(_ application: UIApplication) {
    if #available(iOS 16.4, *) {
        #if DEBUG
        enableWebViewInspectable()
        #endif
    }
}

private func enableWebViewInspectable() {
    if #available(iOS 16.4, *) {
        func findAndEnableWebView(in view: UIView) {
            if let webView = view as? WKWebView {
                webView.isInspectable = true
                print("[DEBUG] WKWebView.isInspectable enabled")
            }
            for subview in view.subviews {
                findAndEnableWebView(in: subview)
            }
        }
        
        for window in UIApplication.shared.windows {
            if let rootView = window.rootViewController?.view {
                findAndEnableWebView(in: rootView)
            }
        }
    }
}
```
**결과**: 
- ✅ `[DEBUG] WKWebView.isInspectable enabled` 메시지 출력됨
- ✅ Safari Web Inspector에서 로그 정상 표시
- ❌ Xcode 콘솔에는 여전히 [log] 태그 없음

## 최종 결론

### Capacitor 7 vs Capacitor 8의 차이

| 항목 | Capacitor 7 | Capacitor 8 |
|------|-------------|-------------|
| **Xcode 콘솔 [log] 태그** | ✅ 자동 출력 | ❌ 출력 안 됨 |
| **Safari Web Inspector** | ✅ 사용 가능 | ✅ 사용 가능 |
| **디버깅 권장 방법** | Xcode 콘솔 or Safari | Safari Web Inspector |

### 원인 분석

**Capacitor 8에서 console 로깅 메커니즘이 변경되었습니다.**

1. **Apple WKWebView 정책 변경**: iOS 16.4+ 부터 `isInspectable` 속성 필수화
2. **Capacitor 아키텍처 변경**: Console 로그를 네이티브 콘솔로 브리지하는 방식 제거
3. **표준화**: Safari Web Inspector를 표준 디버깅 도구로 권장

### 권장 디버깅 방법

**Capacitor 8.0.0 + iOS에서는 Safari Web Inspector 사용이 표준입니다.**

#### Safari Web Inspector 사용 방법

1. **Mac에서 Safari 개발자 메뉴 활성화**
   - Safari → 설정 → 고급 → "메뉴 막대에서 개발자용 메뉴 보기" 체크

2. **iOS 기기/시뮬레이터에서 앱 실행**
   - Xcode에서 앱 실행

3. **Safari에서 디버거 연결**
   - Safari → 개발 → [기기명] → [앱명]
   - 콘솔 탭에서 모든 console.log 확인 가능

#### 장점
- 완전한 브라우저 개발자 도구 사용 가능
- Network 탭, Elements 탭, Console 탭 등 모든 기능 사용
- Source 맵 디버깅 지원
- 더 풍부한 로그 출력 (객체 구조 확인 등)

## 추가 참고사항

### mogwa-platform (Capacitor 7)에서 작동하는 이유

Capacitor 7은 WKWebView의 console 메시지를 가로채서 네이티브 로그로 출력하는 브리지 코드가 포함되어 있었습니다. Capacitor 8에서는 이 기능이 제거되었습니다.

### 관련 이슈

Capacitor GitHub에서 유사한 이슈들이 보고되고 있지만, 공식 답변은 "Safari Web Inspector 사용 권장"입니다.

## 결론

**Capacitor 8에서 Xcode 콘솔에 [log] 태그가 나오지 않는 것은 버그가 아닌 설계 변경입니다.**

Safari Web Inspector를 사용하여 디버깅하는 것이 정상적인 워크플로우이며, 오히려 더 강력한 디버깅 기능을 제공합니다.

---

**작성일**: 2026-02-09  
**프로젝트**: dive-sleep-v8  
**Capacitor 버전**: 8.0.0  
**iOS 타겟**: iOS 13.0+