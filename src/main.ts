import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Amplify v6 라이브러리
import { Amplify } from 'aws-amplify';

if (environment.production) {
  enableProdMode();
}

// ✅ 타입 오류 해결을 위해 'as any' 추가
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_o2CJoEJrG',
      userPoolClientId: '11euhinckffa97gcqv2oq2553b',
      identityPoolId: 'ap-northeast-2:4dbe72b2-8e71-4417-a832-9d0bbb452066',
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        }
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: 'https://sdc2ulo5efbodeuzlfgahtgu5i.appsync-api.ap-northeast-2.amazonaws.com/graphql',
      region: 'ap-northeast-2',
      defaultAuthMode: 'userPool'
    }
  },
  Storage: {
    S3: {
      bucket: 'cnsleep-firmware-management-storage',
      region: 'ap-northeast-2'
    }
  },
  // IoT 설정을 여기에 통합
  PubSub: {
    AWS_IoT: {
      // ⚠️ 중요: wss:// 와 /mqtt 를 꼭 포함해야 브라우저에서 작동합니다
      endpoint: 'wss://aulex1hanxenb-ats.iot.ap-northeast-2.amazonaws.com/mqtt',
      region: 'ap-northeast-2'
    }
  }
} as any); // 👈 여기에 'as any'를 붙여서 TypeScript 오류를 방지합니다.

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));