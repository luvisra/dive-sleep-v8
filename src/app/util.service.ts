import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  constructor(
    public loadingController: LoadingController,
    public toastController: ToastController,
    public alertController: AlertController,
    private router: Router
  ) {}

  async dismissLoading() {
    this.loadingController.dismiss();
  }

  async presentLoading(msg: string, delay: number) {
    const loading = await this.loadingController.create({
      message: msg,
      duration: delay
    });
    await loading.present();

    const { role, data } = await loading.onDidDismiss();

    console.log('Loading dismissed!');
  }

  async presentLoadingWithOptions(msg: string, delay: number) {
    const loading = await this.loadingController.create({
      duration: delay,
      message: msg,
      translucent: true,
      cssClass: 'custom-class custom-loading'
    });
    return await loading.present();
  }

  async presentToast(msg: string, dur: number) {
    const toast = await this.toastController.create({
      message: msg,
      duration: dur,
      position: 'bottom',
      color: 'light'
    });
    toast.present();
  }

  replacer(name: string, val: any) {
    // convert RegExp to string
    if ( val && val.constructor === RegExp ) {
        return val.toString();
    } else if ( name === 'str' ) {
        return undefined; // remove from result
    } else {
        return val; // return as is
    }
  }

  async presentToastWithOptions(thisHeader: string, thisMsg: string) {
    const toast = await this.toastController.create({
      header: thisHeader,
      message: thisMsg,
      position: 'top',
      buttons: [
        {
          side: 'start',
          icon: 'star',
          text: 'Favorite',
          handler: () => {
            console.log('Favorite clicked');
          }
        }, {
          text: 'Done',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        }
      ]
    });
    toast.present();
  }

  async presentAlert(head: string, sub: string, msg: string) {
    const alert = await this.alertController.create({
      header: head,
      subHeader: sub,
      message: msg,
      buttons: ['OK']
    });

    await alert.present();
  }

  async presentAlertSimpleConfirm(headerMsg: string, bodyMessage: string) {
    const alert = await this.alertController.create({
      header: headerMsg,
      message: bodyMessage,
      buttons: [
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
          }
        }
      ]
    });

    await alert.present();
  }

  async presentAlertConfirm(headerMsg: string, bodyMessage: string, pageUrl: string) {
    const alert = await this.alertController.create({
      header: headerMsg,
      message: bodyMessage,
      buttons: [
        {
          text: 'OK',
          cssClass: 'primary',
          handler: () => {
            this.router.navigateByUrl(pageUrl);
          }
        }
      ]
    });

    await alert.present();
  }

  dateUtcToKst(utcDate: Date): string {
    const dateInKst = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60 * 1000));
    const dateInKstIso = dateInKst.toISOString();
    return dateInKstIso;
  }

  cloneObject(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Arithmetic mean
  getMean(data: any[]) {
    return data.reduce( (a, b) => {
        return Number(a) + Number(b);
    }) / data.length;
  }

// Standard deviation
  getSD(data: any[]) {
    const m = this.getMean(data);
    return Math.sqrt(data.reduce((sq, n) => {
            return sq + Math.pow(n - m, 2);
        }, 0) / (data.length - 1));
    }

  timeDiff(source: string, target: string) {
    const t1 = moment(source, 'YYYY-MM-DDTHH:mm:ss');
    const t2 = moment(target, 'YYYY-MM-DDTHH:mm:ss');
    const diff = moment.duration(t2.diff(t1)).asSeconds();
    return diff;
  }

  timeDiffMin(source: string, target: string) {
    const t1 = moment(source, 'YYYY-MM-DDTHH:mm');
    const t2 = moment(target, 'YYYY-MM-DDTHH:mm');
    const diff = moment.duration(t2.diff(t1)).asMinutes();
    return diff;
  }

  timeDiffMin2(source: string, target: string) {
    const t1 = moment(source, 'HH:mm');
    const t2 = moment(target, 'HH:mm');
    const diff = moment.duration(t2.diff(t1)).asMinutes();
    return diff;
  }

  /* convert mac string 'XX:XX:XX:XX:XX:XX' to 'DEV_XXXXXXXXXXXX' */
  convertBleMacAddress(bleDev: string) {
    bleDev = bleDev.replace(/:/g, '');
    let c = parseInt(bleDev.substring(11), 16);
    c -= 2;
    bleDev = bleDev.substring(0, bleDev.length - 1);
    bleDev = 'DEV_' + bleDev + c.toString(16).toUpperCase();
    return bleDev;
  }

  getUnique(arr: any[], comp: string) {
    if (arr === undefined) {
      return;
    }
    const unique = arr
         .map((e: any) => e[comp])
       // store the keys of the unique objects
      .map((e: any, i: number, final: any[]) => final.indexOf(e) === i && i)
      // eliminate the dead keys & store unique objects
      .filter((e: any) => arr[e]).map((e: any) => arr[e]);
    return unique;
  }

  getTotal(arr: number[]) {
    if (arr.length === 0) {
      return 0;
    }
    let sum = 0;
    arr.forEach((data: number) => {
      sum += data;
    });

    return sum;
  }

  ab2str(buf: ArrayBuffer) {
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
  }

  str2ab(str: string) {
    const buf = new ArrayBuffer(str.length + 1);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    bufView[str.length] = 0x0;
    return buf;
  }

  getDeviceCode(str: string): number {
    const devCode = '0x' + str.slice(12, 16);
    const res = parseInt(devCode);
    console.log(devCode, res);
    return res;
  }

  getTimeFromMins(mins: number) {
    // do not include the first validation check if you want, for example,
    // getTimeFromMins(1530) to equal getTimeFromMins(90) (i.e. mins rollover)
    if (mins >= 24 * 60 || mins < 0) {
        throw new RangeError('Valid input should be greater than or equal to 0 and less than 1440.');
    }
    const h = mins / 60;
    const m = mins % 60;
    return moment.utc().hours(h).minutes(m).format('hh:mm');
  }

  pad(n: any, width: number) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
  }

  b64toBlob(b64Data: string, contentType?: string) {
    contentType = contentType || '';
    const sliceSize = 512;
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

  dynamicSort(property: string) {
    return (a: any, b: any) => {
        return (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
    };
  }
}
