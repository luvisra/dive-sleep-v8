import { Injectable } from '@angular/core';
import { list, getUrl, uploadData } from 'aws-amplify/storage';
import { UtilService } from './/util.service';

@Injectable({
  providedIn: 'root'
})
export class S3Service {

  async getUserPhotoFromS3(userName: string) {
    try {
      const result = await list({
        path: userName + '_photo.jpg'
      });

      console.log(userName, result);

      if (!result.items || result.items.length === 0) {
        return undefined;
      }

      const urlResult = await getUrl({
        path: userName + '_photo.jpg'
      });

      return urlResult.url.toString();
    } catch (err) {
      console.error('Error getting user photo:', err);
      throw err;
    }
  }

  async uploadUserPhotoToS3(image: any, imageName: string) {
    const realData = image.changingThisBreaksApplicationSecurity.split(',');
    console.log(realData);

    const blobData = this.utilService.b64toBlob(realData[1], 'image/jpeg');

    try {
      const result = await uploadData({
        path: imageName,
        data: blobData,
        options: {
          contentType: 'image/jpeg'
        }
      }).result;

      return result;
    } catch (err) {
      console.error('Error uploading photo:', err);
      throw err;
    }
  }

  constructor(
    private utilService: UtilService
  ) { }
}
