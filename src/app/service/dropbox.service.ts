import { Injectable } from '@angular/core';
import { Dropbox } from 'dropbox';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private dbx!: Dropbox;
  constructor(private http: HttpClient) {
    this.exchangeAuthorizationCodeForAccessToken();
  }

  uploadFile(filePath: string, fileContent: string) {
    this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
    return this.dbx.filesUpload({ path: filePath, contents: fileContent });
  }


  exchangeAuthorizationCodeForAccessToken() {
    const dropboxAppKey = '72ecq2vxlip8j51';
    const dropboxAppSecret = 'btxsvfze6gzz7tk';
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  
    const params = new HttpParams()
      .set('refresh_token', 'sL19DldRa4wAAAAAAAAAAdrh2T7brBUwud0PU64qYnRwGPPxtuQSHkpvXgCIYtW8')
      .set('grant_type', 'refresh_token')
      .set('client_id', dropboxAppKey)
      .set('client_secret', dropboxAppSecret)
  
    this.http.post('https://api.dropboxapi.com/oauth2/token', params, { headers })
      .subscribe((response: any) => {
        const accessToken = response.access_token;
        console.log('Access token:', accessToken);
        sessionStorage.setItem('access_token', accessToken)
        // Store the access token securely and use it for API calls
      });
  }
}