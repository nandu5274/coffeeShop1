import { Component, EventEmitter, Input, Output } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
@Component({
  selector: 'app-login',
  templateUrl: './payment-login.component.html',
  styleUrls: ['./payment-login.component.scss']
})
export class PaymentLoginComponent {

  constructor(private dropboxService: DropboxService, private sharedService: SharedService) { }

  @Output() loginStatus: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() pageType: string = '';
  username: string = '';
  password: string = '';
  showError: boolean = false;
  loginDetails: any;
  showPassword: boolean = false;
  userValidationStatus: boolean = false;

  encryptedPassword: string = '';
  loginDetailsData: any;
  showSpinner: Boolean = false;
  login() {
    this.encryptPassword()
    this.showSpinner = true;
   
  if(this.pageType == "admin")
  {
    sessionStorage.removeItem('loginDetails');
  }
  const sessionCartDataList = sessionStorage.getItem('loginDetails');
    if (sessionCartDataList) {
      this.loginDetailsData = JSON.parse(atob(sessionStorage.getItem('loginDetails')!));
      this.validateUser(this.pageType)
    } else {
      this.getLoginDetails();
    }

  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }


  encryptPassword() {
    const key = 'your-secret-key'; // Replace with a secure secret key
    const encrypted = CryptoJS.AES.encrypt(this.password, key).toString();
    this.encryptedPassword = encrypted;
    console.log("this.encryptedPassword ", this.encryptedPassword );
  }

  decryptPassword(pas: any) {
    const key = 'your-secret-key'; // Replace with the same secret key used for encryption
    const decrypted = CryptoJS.AES.decrypt(pas, key).toString(CryptoJS.enc.Utf8);
    return decrypted

  }


  async getLoginDetails() {
    let path =''
    if(this.pageType == "admin")
    {
       path = '/login_users/admin_logins.csv';
    }
    else
    {
       path = '/login_users/logins.csv';
    }
    this.loginDetails = await this.dropboxService.getFileData(path);
    const respo = this.sharedService.parseCsvText(await this.sharedService.readBlobAsText(this.loginDetails.fileBlob)).then(
      (data) => {
        this.loginDetailsData = data;
        sessionStorage.setItem("loginDetails", btoa(JSON.stringify(this.loginDetailsData)))
        this.validateUser(this.pageType);

      },
      (error) => {
        this.showError = true;
      }
    );
  }

  validateUser(pageType: any) {
    if(pageType == "admin")
    {
      const user = this.loginDetailsData.find((u: any) =>
        u.username === u.username && this.decryptPassword(u.password) === this.password);
      this.userValidationStatus = !!user;
      this.loginStatus.emit( this.userValidationStatus);
      if (!this.userValidationStatus) {
        this.showError = true;
      } else {
        sessionStorage.removeItem('loginDetails');
        this.showError = false;
      }
      this.showSpinner = false;

    }
    else{
      const user = this.loginDetailsData.find((u: any) =>
        u.username === u.username && this.decryptPassword(u.password) === this.password);
      this.userValidationStatus = !!user;
      this.loginStatus.emit( this.userValidationStatus);
      if (!this.userValidationStatus) {
        this.showError = true;
      } else {
        this.showError = false;
      }
      this.showSpinner = false;
    }
    }

}
