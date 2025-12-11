import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'first',
    loadChildren: () => import('./first/first.module').then( m => m.FirstPageModule)
  },
  {
    path: 'intro',
    loadChildren: () => import('./intro/intro.module').then( m => m.IntroPageModule)
  },
  {
    path: 'userlogin',
    loadChildren: () => import('./userlogin/userlogin.module').then( m => m.UserloginPageModule)
  },
  {
    path: 'device-registration',
    loadChildren: () => import('./device-registration/device-registration.module').then( m => m.DeviceRegistrationPageModule)
  },
  {
    path: 'blescan',
    loadChildren: () => import('./blescan/blescan.module').then( m => m.BlescanPageModule)
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then( m => m.SignupPageModule)
  },
  {
    path: 'usage',
    loadChildren: () => import('./usage/usage.module').then( m => m.UsagePageModule)
  },
  {
    path: 'validate-sign',
    loadChildren: () => import('./validate-sign/validate-sign.module').then( m => m.ValidateSignPageModule)
  },
  {
    path: 'change-password',
    loadChildren: () => import('./change-password/change-password.module').then( m => m.ChangePasswordPageModule)
  },
  {
    path: 'debug',
    loadChildren: () => import('./debug/debug.module').then( m => m.DebugPageModule)
  },
  {
    path: 'realtime-chart',
    loadChildren: () => import('./realtime-chart/realtime-chart.module').then( m => m.RealtimeChartPageModule)
  },
  {
    path: 'wificonnection',
    loadChildren: () => import('./wificonnection/wificonnection.module').then( m => m.WificonnectionPageModule)
  },
  {
    path: 'terms-conditions',
    loadChildren: () => import('./terms-conditions/terms-conditions.module').then( m => m.TermsConditionsPageModule)
  },
  {
    path: 'ota',
    loadChildren: () => import('./ota/ota.module').then( m => m.OtaPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
    path: 'privacy-policy',
    loadChildren: () => import('./privacy-policy/privacy-policy.module').then( m => m.PrivacyPolicyPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
