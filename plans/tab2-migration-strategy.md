# Tab2 페이지 빌드 오류 수정 전략

## 📋 분석 요약

### 현재 상태
- **프로젝트**: Ionic 3 + Capacitor 3에서 시작 → 현재 Ionic 8 + Capacitor 8
- **주요 의존성**:
  - Angular: v20.0.0
  - Ionic: v8.0.0
  - Chart.js: v4.5.1
  - ng2-charts: v5.0.4
  - Swiper: v11.2.10

### 파일 정보
- **TypeScript**: `src/app/tab2/tab2.page.ts` (3044 줄)
- **HTML**: `src/app/tab2/tab2.page.html` (686 줄)
- **Module**: `src/app/tab2/tab2.module.ts`

---

## 🔍 빌드 오류의 공통 분모

### 1. **Swiper.js 레거시 코드 문제**

#### 문제점
```typescript
// Line 37-195: Ionic 3 스타일의 cube effect 설정
slideOpts = {
  on: {
    beforeInit() {
      const swiper = this;  // ❌ TypeScript 타입 오류
      swiper.classNames.push(...);  // ❌ Swiper 11 API 변경
    },
    setTranslate() {
      const swiper = this;
      swiper.$el  // ❌ jQuery 스타일 선택자 (Swiper 11에서 제거됨)
      swiper.$(...)  // ❌ 더 이상 지원되지 않음
    }
  }
}
```

#### 근본 원인
- **ion-slides → Swiper 직접 사용**: Ionic 6부터 ion-slides가 제거됨
- **Swiper 11 API 변경**: 
  - `swiper.$` 제거 (jQuery 의존성 제거)
  - `params` 객체 구조 변경
  - Custom effect 구현 방식 변경
- **this 컨텍스트 문제**: Arrow function vs regular function

---

### 2. **Chart.js v4 타입 불일치**

#### 문제점
```typescript
// Line 248-270: 타입 정의가 불완전
public sleepStatusChartData: ChartConfiguration['data']['datasets'] = [
  {
    data: [25, 50, 75, 99],
    type: 'line',
    // ❌ 일부 속성만 정의됨, Chart.js v4에서 필수 속성 누락 가능
  }
];

// Line 273: any 타입 사용
public sleepStatusChartOptions: any = {
  // ❌ 타입 안전성 부족
};
```

#### 근본 원인
- **ng2-charts v5 + Chart.js v4**: API 변경사항 많음
  - `xAxes/yAxes` → `x/y` (이미 일부 수정됨)
  - `tooltips` → `tooltip`
  - 플러그인 등록 방식 변경
- **타입 정의 불완전**: `any` 사용으로 컴파일 타임 체크 우회

---

### 3. **복합적 타입 오류**

#### 문제점
```typescript
// Line 1518: ViewChild without type
@ViewChild(BaseChartDirective) private chart: BaseChartDirective;

// Swiper 초기화 (Line 1708-1721)
const swiperEl = document.querySelector('.advice-swiper') as any;  // ❌
this.adviceSwiper = new Swiper('.advice-swiper', {
  ...this.slideOpts,  // ❌ 타입 호환성 문제
});
```

#### 근본 원인
- **Angular 20 엄격한 타입 체크**
- **Swiper 11 타입 정의 변경**
- **레거시 코드와 신규 API 혼재**

---

## 🎯 수정 전략

### Phase 1: Swiper 마이그레이션 (우선순위: 높음)

#### 1.1 레거시 Cube Effect 코드 제거
```typescript
// ❌ 삭제: Line 37-195 전체
slideOpts = {
  pagination: { ... },
  on: { beforeInit() {}, setTranslate() {}, setTransition() {} }
}
```

#### 1.2 Swiper 11 표준 방식으로 대체
```typescript
// ✅ 새로운 방식
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

private swiperOptions: SwiperOptions = {
  pagination: {
    el: '.swiper-pagination',
    type: 'fraction'
  },
  effect: 'cube',  // Swiper 내장 cube effect 사용
  cubeEffect: {
    shadow: true,
    slideShadows: true,
    shadowOffset: 20,
    shadowScale: 0.94,
  },
  grabCursor: true,
  slidesPerView: 1,
  spaceBetween: 10,
};
```

#### 1.3 초기화 로직 개선
```typescript
initAdviceSwiper() {
  if (this.careDisplayInfoArray.length > 0 && !this.adviceSwiper) {
    setTimeout(() => {
      this.adviceSwiper = new Swiper('.advice-swiper', this.swiperOptions);
    }, 300);
  }
}
```

#### 영향도
- **수정 범위**: 159 줄 제거 + 20 줄 추가
- **테스트 필요**: Advice 슬라이드 동작 확인

---

### Phase 2: Chart.js 타입 안정성 개선 (우선순위: 중간)

#### 2.1 any 타입 제거
```typescript
// ❌ Before
public sleepStatusChartOptions: any = { ... };

// ✅ After
import { ChartOptions } from 'chart.js';

public sleepStatusChartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: { ... },
  scales: { ... }
};
```

#### 2.2 데이터셋 타입 명확화
```typescript
// ✅ 개선
import { ChartDataset } from 'chart.js';

public sleepStatusChartData: ChartDataset<'line'>[] = [
  {
    data: [],
    label: 'Sleep',
    type: 'line',
    borderWidth: 1,
    borderColor: '#3478F5',
    backgroundColor: 'rgba(52, 120, 245, 0.28)',
    pointRadius: 0,
  }
];
```

#### 영향도
- **수정 범위**: 약 15개 차트 옵션 객체
- **기능 변경**: 없음 (타입만 추가)

---

### Phase 3: TypeScript 엄격성 대응 (우선순위: 중간)

#### 3.1 ViewChild 타입 명시
```typescript
// ✅ 개선
@ViewChild(BaseChartDirective, { static: false }) 
private chart?: BaseChartDirective;
```

#### 3.2 옵셔널 체이닝 적용
```typescript
// 예시: Line 2378-2387
this.weekChartOptions2.plugins?.annotation?.annotations?.[0].value = 
  this.deviceService.targetTotalSleepTimeValue;
```

#### 영향도
- **수정 범위**: 산발적 (약 30-40개 위치)
- **기능 변경**: 없음 (안전성 향상)

---

## 📊 수정 우선순위 및 예상 작업량

| Phase | 작업 | 우선순위 | 예상 시간 | 위험도 |
|-------|------|----------|-----------|--------|
| 1 | Swiper 레거시 제거 | 🔴 높음 | 2시간 | 중간 |
| 2 | Chart.js 타입 개선 | 🟡 중간 | 3시간 | 낮음 |
| 3 | TypeScript 엄격성 | 🟡 중간 | 2시간 | 낮음 |
| 4 | 테스트 및 검증 | 🔴 높음 | 2시간 | - |

**총 예상 시간**: 9시간

---

## 🔧 구체적 수정 계획

### Step 1: Swiper 코드 정리
1. Line 37-195 제거
2. `SwiperOptions` 타입 import 및 적용
3. HTML 검증 (이미 올바른 형태로 작성됨)
4. 초기화 로직 간소화

### Step 2: Chart.js 타입 안정화
1. 모든 `any` 타입 제거
2. `ChartOptions`, `ChartDataset` 타입 적용
3. 플러그인 타입 검증

### Step 3: 전체 타입 체크
1. `ng build --configuration production` 실행
2. 타입 오류 목록 추출
3. 우선순위별 수정

### Step 4: 기능 테스트
1. Daily view: 차트 렌더링 확인
2. Weekly view: 통계 차트 확인
3. Monthly view: 캘린더 및 차트 확인
4. Advice swiper: 슬라이드 동작 확인

---

## ⚠️ 주의사항

### 1. Swiper Cube Effect
- **문제**: 커스텀 cube effect 제거 시 시각적 변화 발생 가능
- **해결**: Swiper 내장 cube effect로 대체 (동작 확인 필요)
- **대안**: Effect를 'slide'로 변경 (안전한 선택)

### 2. Chart 플러그인
- **현재 상태**: `annotationPlugin`, `ChartDataLabels` 사용 중
- **확인 필요**: Chart.js v4와의 호환성
- **대응**: 플러그인 버전 확인 및 필요시 업데이트

### 3. 성능 고려사항
- **대량 데이터**: 월간 차트 (최대 31일 데이터)
- **최적화**: 필요시 virtual scrolling 고려

---

## 🚀 다음 단계

1. ✅ 현재 빌드 오류 전체 목록 확인
2. Phase 1 실행 (Swiper 마이그레이션)
3. 빌드 성공 확인
4. Phase 2-3 순차 진행
5. 최종 테스트 및 검증

---

## 📝 추가 고려사항

### HTML 수정 필요 여부
- **현재 상태**: 이미 Swiper 11 문법으로 작성됨 (Line 313-325)
- **결론**: HTML 수정 불필요

### Module 설정
- **현재 상태**: NgChartsModule 정상 import됨
- **결론**: Module 수정 불필요

### 호환성 매트릭스
| 패키지 | 현재 버전 | 호환성 | 비고 |
|--------|----------|--------|------|
| Angular | 20.0.0 | ✅ | 최신 |
| Ionic | 8.0.0 | ✅ | 최신 |
| Swiper | 11.2.10 | ✅ | 최신 |
| Chart.js | 4.5.1 | ✅ | 최신 |
| ng2-charts | 5.0.4 | ✅ | Chart.js v4 호환 |

---

**작성일**: 2025-12-11  
**검토자**: Architect Mode  
**상태**: 계획 완료, 구현 대기