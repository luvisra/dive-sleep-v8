import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TranslateConfigService {
  // param = {value: 'world'};
  constructor(private translate: TranslateService) { }

  getDefaultLanguage(): string {
    const language = this.translate.getBrowserLang() || 'en';
    console.log('translate', 'language = ', language);
    this.translate.setDefaultLang(language);
    return language;
  }

  setLanguage(setLang: string): void {
    this.translate.use(setLang);
  }
}
