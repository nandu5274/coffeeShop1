import { Component, EventEmitter, Input, Output } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { DataService } from '../service/data.service';
import { GraphqlService } from '../service/graphql.service';
import { DatePipe } from '@angular/common';
import { MutationResult } from 'apollo-angular';
import { catchError, throwError } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './payment-login.component.html',
  styleUrls: ['./payment-login.component.scss']
})
export class PaymentLoginComponent {

  constructor(private dropboxService: DropboxService, private sharedService: SharedService,
    private dataService: DataService, private graphqlService: GraphqlService, private datePipe: DatePipe) { }

  @Output() loginStatus: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() pageType: string = '';
  username: string = '';
  password: string = '';
  sign_up_generated_otp: any = '';
  renew_generated_otp:any = '';
  Sign_up_username: string = '';
  Sign_up_password: string = '';
  Sign_up_otp: string = '';
  sign_in_username: string = '';
  sign_in_password: string = '';
  renew_up_username: string = '';
  renew_up_otp: string = '';

  showSignUpSuccessBanner: boolean = false;
  errorOccurredBanner: boolean = false;
  loginShowErrorBanner: boolean = false;
  loginSessionExpiredBanner: boolean = false;
  showRenewOtpBanner:boolean = false;
  showRenewSuccessBanner:boolean = false;
  showOtpPannel: boolean = false;
  showRenewOtpPannel: boolean = false;
  renewErrorOccurredBanner:boolean = false;
  showError: boolean = false;
  loginDetails: any;
  isotpSend: boolean = false;
  showPassword: boolean = false;
  userValidationStatus: boolean = false;
  showSignUpOtpBanner: boolean = false
  encryptedPassword: string = '';
  loginDetailsData: any;
  showSpinner: Boolean = false;
  login() {

    if (this.pageType == "cap") {

    }
    else {
      this.normalLogin()
    }


  }

  normalLogin() {
    this.encryptPassword()
    this.showSpinner = true;

    if (this.pageType == "admin") {
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
    console.log("this.encryptedPassword ", this.encryptedPassword);
    return encrypted;
  }
  encryptCapPassword(capPassword:any) {
    const key = 'your-secret-key'; // Replace with a secure secret key
    const encrypted = CryptoJS.AES.encrypt(capPassword, key).toString();
    this.encryptedPassword = encrypted;
    console.log("this.encryptedPassword ", this.encryptedPassword);
    return encrypted;
  }
  decryptPassword(pas: any) {
    const key = 'your-secret-key'; // Replace with the same secret key used for encryption
    const decrypted = CryptoJS.AES.decrypt(pas, key).toString(CryptoJS.enc.Utf8);
    return decrypted

  }


  async getLoginDetails() {
    let path = ''
    if (this.pageType == "admin") {
      path = '/login_users/admin_logins.csv';
    }
    else {
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
    if (pageType == "admin") {
      const user = this.loginDetailsData.find((u: any) =>
        u.username === u.username && this.decryptPassword(u.password) === this.password);
      this.userValidationStatus = !!user;
      this.loginStatus.emit(this.userValidationStatus);
      if (!this.userValidationStatus) {
        this.showError = true;
      } else {
        sessionStorage.removeItem('loginDetails');
        this.showError = false;
      }
      this.showSpinner = false;

    }
    else {
      const user = this.loginDetailsData.find((u: any) =>
        u.username === u.username && this.decryptPassword(u.password) === this.password);
      this.userValidationStatus = !!user;
      this.loginStatus.emit(this.userValidationStatus);
      if (!this.userValidationStatus) {
        this.showError = true;
      } else {
        this.showError = false;
      }
      this.showSpinner = false;
    }
  }

  selectedTab: string = 'sign_in';

  selectTab(tabName: string): void {

    this.selectedTab = tabName;
this.clearAllBanners()
    if (tabName == 'waiting_order') {
      //this.getUpdatedApprovalWaitingOrders();
    } else if (tabName == 'Accepted_order') {
      // this.getUpdatedApprovedOrders();
    }
  }

  sendSignupOtp() {
    this.sign_up_generated_otp = Math.floor(Math.random() * 9000) + 1000;
      this.sendOtpThroughMail(this.sign_up_generated_otp, this.Sign_up_username);
    this.showOtpPannel = true
  }


  sendOtpThroughMail(otp: any, username: any) {
    let request: any = {};
    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! " + username + "\nThis is a message from the cafe kubera here is the otp: " + otp + " \n\nThanks";
    request.subject = otp + " is OTP for the users " + username + " for Ordering Page ";
    this.dataService.SendSimpleMail(request).subscribe();
  }

  sendRenewOtpThroughMail(otp: any, username: any) {
    let request: any = {};
    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! " + username + "\nThis is a message from the cafe kubera here is the otp: " + otp + " \n\nThanks";
    request.subject = otp + " is renew OTP for the users " + username + " for Ordering Page ";
    this.dataService.SendSimpleMail(request).subscribe();
  }

  createSignUpUser() {
    this.clearAllBanners();
    let isUserValid = this.validateSignUpUser();
    if (isUserValid) {
      this.createUserinDb()
    }

  }

  validateSignUpUser() {
    if (this.sign_up_generated_otp == this.Sign_up_otp) {
      this.showSignUpOtpBanner = false;
      return true;
    } else {
      this.showSignUpOtpBanner = true;
      return false;
    }
  }



  createUserinDb() {
    this.showSpinner = true;
    let employeeData: any = {};
    employeeData.user_name = this.Sign_up_username;
    employeeData.password = btoa(JSON.stringify(this.Sign_up_password))
    employeeData.renew_date = this.getFormattedDate()
    employeeData.expire_in = 12;
    this.graphqlService.createEmployeeLogin(employeeData).subscribe(
      (result: any) => {
        this.clearAllBanners()
        this.showSignUpSuccessBanner = true
        this.showSpinner = false;
        this.SaveUserToSessionStorage(result.data.insert_kubera_employee_login_one);
      },
      (error: any) => {
        this.clearAllBanners()
        this.errorOccurredBanner = true;
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      }
    );
  }

  clearAllBanners() {
    this.showSignUpSuccessBanner = false;
    this.errorOccurredBanner = false;
    this.showSignUpOtpBanner = false;
    this.showError = false;
    this.loginSessionExpiredBanner =false
    this.loginShowErrorBanner=false
    this.showRenewOtpBanner = false;
    this.showRenewSuccessBanner=false
  }
  backToSignup() {
    this.clearAllBanners();
    this.showOtpPannel = false
  }

  getFormattedDate(): string {
    const now = new Date();
    const time = this.datePipe.transform(now, 'yyyy-MM-ddTHH:mm:ssZ') ?? '';
    return time;
  }
  SaveUserToSessionStorage(data: any) {
    let localStorageData: any = {};
    localStorageData.expire_in = data.expire_in;
    localStorageData.user_name = data.user_name;
    localStorageData.renew_date = data.renew_date;
    let decodedPassword = JSON.parse(atob(data.password!));
    localStorageData.password = decodedPassword;
    localStorage.setItem("cap_user", btoa(JSON.stringify(localStorageData)));
    this.backToSignup()
    this.showSignUpSuccessBanner = true
    this.clearFields();
  }
  clearFields() {
    this.sign_up_generated_otp = "";
    this.Sign_up_username = "";
    this.Sign_up_password = "";
  }
  loginCap() {
    let localStorageData =localStorage.getItem("cap_user");
    this.clearAllBanners()
    if (localStorageData) {
      let user_details = JSON.parse(atob(localStorage.getItem('cap_user')!));
      if (user_details.user_name === this.sign_in_username && user_details.password === this.sign_in_password) {
        let is_user_Session_Expired: any = this.validateUserSession(user_details);
        if (!is_user_Session_Expired) {
          this.loginStatus.emit(!is_user_Session_Expired);
        } else {
          localStorage.removeItem("cap_user");
          this.loginSessionExpiredBanner = true;
        }
      } else {
        this.loginShowErrorBanner = true;
      }

    } else {
      this.showSpinner = true
      //call api
      this.graphqlService.getEmployeeLoginDetailsByUserName(this.sign_in_username).subscribe(
        (result: any) => {
          this.clearAllBanners()
          this.showSignUpSuccessBanner = true
          this.showSpinner = false;
          if(result.data.kubera_employee_login[0] != undefined)
          {
            this.SaveUserToSessionStorage(result.data.kubera_employee_login[0]);
            this.loginCap();
          }else
          {
            this.loginShowErrorBanner = true;
          }
          
        },
        (error: any) => {
          this.loginShowErrorBanner = true
          this.showSpinner = false
        }
      );
    }
  }

  validateUserSession(user_details: any) {

    const givenDateObj = new Date(user_details.renew_date);

    // Adjust for EST to IST time difference (9 hours and 30 minutes)
    givenDateObj.setTime(givenDateObj.getTime() + (9 * 60 + 30) * 60 * 1000);

    const currentDate = new Date();

    const timeDiff = currentDate.getTime() - givenDateObj.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    let is_Exceeeded = hoursDiff >= user_details.expire_in;
    return is_Exceeeded;
  }

  sendRenewOtp(){
    this.renew_generated_otp = Math.floor(Math.random() * 9000) + 1000;
    this.sendRenewOtpThroughMail(this.renew_generated_otp, this.renew_up_username);
    this.showRenewOtpPannel = true
  }


  updateUserRenewTime() {
    this.clearAllBanners();
    let isUserValid = this.validateRenewUser();
    if (isUserValid) {
      this.updateUserRenewDb()
    }

  }


  validateRenewUser() {
    if (this.renew_generated_otp == this.renew_up_otp) {
      this.showRenewOtpBanner = false;
      return true;
    } else {
      this.showRenewOtpBanner = true;
      return false;
    }
  }


  updateUserRenewDb() {
    this.showSpinner = true;
    let employeeData: any = {};
  let renew_date = this.getFormattedDate()
  let renew_username = this.renew_up_username;
    this.graphqlService.updateEmployeeRenewDetailsByUserName(renew_username,renew_date).subscribe(
      (result: any) => {
        this.clearAllBanners()
       
        this.showSpinner = false;
        if(result.data.update_kubera_employee_login.returning[0] != undefined)
          {
            this.showRenewSuccessBanner = true
          localStorage.removeItem('cap_user')
          }else
          {
            this.renewErrorOccurredBanner = true;
          }
      },
      (error: any) => {
        this.clearAllBanners()
        this.renewErrorOccurredBanner = true;
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      }
    );
  }

}
