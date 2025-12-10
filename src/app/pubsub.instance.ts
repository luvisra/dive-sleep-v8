// ⚠️ 핵심: Amplify v6에서는 AWSIoT 클래스를 직접 인스턴스화합니다
// AWSIoT 클래스가 subscribe/publish 메서드를 포함한 완전한 PubSub 구현체입니다
import { PubSub as AWSIoTPubSub } from '@aws-amplify/pubsub/iot';

console.log('[PubSub Init] ========== PubSub 초기화 시작 ==========');
console.log('[PubSub Init] 시각:', new Date().toISOString());

// AWSIoT 인스턴스 생성 (이것이 Amplify v6의 올바른 방식)
const pubsubInstance = new AWSIoTPubSub({
  region: 'ap-northeast-2',
  endpoint: 'wss://aulex1hanxenb-ats.iot.ap-northeast-2.amazonaws.com/mqtt',
  clientId: undefined, // undefined면 자동 생성됨
});

console.log('[PubSub Init] 1. AWSIoT 인스턴스 생성 완료');
console.log('[PubSub Init] 설정:', JSON.stringify({
  region: 'ap-northeast-2',
  endpoint: 'wss://aulex1hanxenb-ats.iot.ap-northeast-2.amazonaws.com/mqtt'
}, null, 2));
console.log('[PubSub Init] PubSub 타입:', typeof pubsubInstance);
console.log('[PubSub Init] PubSub.subscribe 존재:', typeof pubsubInstance.subscribe === 'function');
console.log('[PubSub Init] PubSub.publish 존재:', typeof pubsubInstance.publish === 'function');

// cleanSession 설정 (옵션)
console.log('[PubSub Init] 2. cleanSession 설정 적용 중...');
try {
  // AWSIoT는 MqttOverWS를 상속하므로 options를 통해 설정 가능
  const config: any = {
    region: 'ap-northeast-2',
    endpoint: 'wss://aulex1hanxenb-ats.iot.ap-northeast-2.amazonaws.com/mqtt',
    clientId: undefined,
    cleanSession: 1
  };

  // 기존 인스턴스에 설정 덮어쓰기 (내부 _config 접근)
  if ((pubsubInstance as any)._config) {
    (pubsubInstance as any)._config = {
      ...(pubsubInstance as any)._config,
      cleanSession: 1
    };
    console.log('[PubSub Init] ✅ cleanSession 설정 완료');
  }
} catch (error) {
  console.error('[PubSub Init] ⚠️ cleanSession 설정 실패:', JSON.stringify(error, null, 2));
}

// 내부 설정 확인
console.log('[PubSub Init] 3. 내부 상태 확인...');
try {
  const internalConfig = (pubsubInstance as any)._config;
  if (internalConfig) {
    console.log('[PubSub Init] _config:', JSON.stringify(internalConfig, null, 2));
  } else {
    console.log('[PubSub Init] _config가 없습니다 (정상일 수 있음)');
  }

  // clientId 확인
  const clientId = (pubsubInstance as any).clientId;
  console.log('[PubSub Init] clientId:', clientId || '자동 생성됨');

  // connectionState 확인
  const connectionState = (pubsubInstance as any).connectionState;
  if (connectionState) {
    console.log('[PubSub Init] connectionState:', JSON.stringify(connectionState, null, 2));
  }

  // clientsQueue 확인 (연결 상태)
  const clientsQueue = (pubsubInstance as any)._clientsQueue;
  if (clientsQueue) {
    const allClients = clientsQueue.allClients || [];
    console.log('[PubSub Init] 연결된 클라이언트 수:', allClients.length);
    if (allClients.length > 0) {
      console.log('[PubSub Init] 클라이언트 목록:', JSON.stringify(allClients, null, 2));
    }
  }

  console.log('[PubSub Init] ✅ AWSIoT 인스턴스가 정상적으로 생성되었습니다');
} catch (error) {
  console.error('[PubSub Init] 내부 상태 확인 실패:', JSON.stringify(error, null, 2));
}

console.log('[PubSub Init] ========== PubSub 초기화 완료 ==========');

export const PubSub = pubsubInstance;
