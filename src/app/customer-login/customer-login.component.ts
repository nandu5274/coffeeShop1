import { Component, EventEmitter, Input, Output } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { DropboxService } from '../service/dropbox.service';
import { SharedService } from '../service/shared-service';
import { DataService } from '../service/data.service';
import { GraphqlService } from '../service/graphql.service';
import { DatePipe } from '@angular/common';
import { MutationResult } from 'apollo-angular';
import { catchError, throwError } from 'rxjs';
import { CustomerService } from '../service/customer.service';
import { ENCRYPT_KEY } from '../common/constanst';
@Component({
  selector: 'app-customer-login',
  templateUrl: './customer-login.component.html',
  styleUrls: ['./customer-login.component.scss']
})
export class CustomerLoginComponent {

  constructor(private dropboxService: DropboxService, private sharedService: SharedService,
    private dataService: DataService, private customerService: CustomerService, private datePipe: DatePipe) { }

    

  @Output() loginStatus: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Input() pageType: string = 'cap';
  username: string = '';
  password: string = '';
  sign_up_generated_otp: any = '';
  renew_generated_otp:any = '';
  Sign_up_username: string = '';
  Sign_up_password: string = '';
  Sign_up_email_id: string = '';
  Sign_up_mobileNumber:any = '';
  Sign_up_otp: string = '';
  sign_in_username: string = '';
  sign_in_password: string = '';
  reset_password: string = '';
  renew_up_username: string = '';
  renew_up_otp: string = '';

  showSignUpSuccessBanner: boolean = false;
  errorOccurredBanner: boolean = false;
  loginShowErrorBanner: boolean = false;
  loginSessionExpiredBanner: boolean = false;
  showRenewOtpBanner:boolean = false;
  showRenewSuccessBanner:boolean = false;
  showEmailIdNotFOundError:boolean = false
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
    this.clearFields();
    this.showRenewOtpPannel = false
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
//check user is exist or not 
//if exist throw error
//else create the new user
    this.sendOtpThroughMailWithMail(this.sign_up_generated_otp, this.Sign_up_username, this.Sign_up_email_id);
    this.showOtpPannel = true
  }

  sendOtpThroughMailWithMail(otp: any, username: any, mailId:any)
  {
    let request: any = {};
    request.recipient = mailId;
    request.msgBody = "Hey! " + username + "\nThis is a message from the cafe kubera for registration."+" \n\n Here is the otp: " + otp 
    + " \n\nThanks and Regards,\nCAFE KUBERA,\n3rd line, near Guru Nanak Colony,\nKanaka Durga Gazetted Officers Colony, \nGuru Nanak Colony, Vijayawada, Andhra Pradesh 520007.\ncontact: 9652544239";
    request.subject = otp + " is OTP for the user name " + username + " for Cafe kubera Registration ";
    this.dataService.SendSimpleMail(request).subscribe();
  }

  sendOtpThroughMail(otp: any, username: any) {
    let request: any = {};
    request.recipient = "cafekubera2223@gmail.com";
    request.msgBody = "Hey! " + username + "\nThis is a message from the cafe kubera here is the otp: " + otp + " \n\nThanks";
    request.subject = otp + " is OTP for the users " + username + " for Ordering Page ";
    this.dataService.SendSimpleMail(request).subscribe();
  }

  sendRenewOtpThroughMail(otp: any, email_id: any) {
    let request: any = {};
    request.recipient = email_id;
    request.msgBody = "Hey! \nThis is a message from the cafe kubera here is the password reset otp: " + otp + " \n\nThanks";
    request.subject = otp + " is password Reset OTP for Cafe kubera login ";
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

  isFormValid(): boolean {
    return this.Sign_up_username.trim() !== '' &&
    this.Sign_up_email_id.trim() !== '' &&
    this.Sign_up_mobileNumber.trim() !== ''  &&
   // Check if mobile number is a number
    this.Sign_up_password.trim() !== '';
  }
  triggerRegistrationSuccessMail(customerData:any)
  {
    let request: any = {};
    request.recipient = customerData.email_id;
    request.msgBody = "Hey! " + customerData.name + "\n Thank you for registering at Cafe Kubera. \n\nhere are you details: " 
    + "\nuser name : "+ customerData.name + "\nemail id: " + customerData.email_id + "\nmobile number: "+ customerData.mobile_number
    + " \n\nThanks and Regards,\nCAFE KUBERA,\n3rd line, near Guru Nanak Colony,\nKanaka Durga Gazetted Officers Colony, \nGuru Nanak Colony, Vijayawada, Andhra Pradesh 520007.\ncontact: 9652544239";
    request.subject =  "Thank you for registering at Cafe Kubera"
    this.dataService.SendSimpleMail(request).subscribe();
  }

  createUserinDb() {
    this.showSpinner = true;
    let customer_points: any = {};
    let customerData: any = {};
   
    customerData.name = this.Sign_up_username;
    customerData.email_id = this.Sign_up_email_id
    customerData.mobile_number = this.Sign_up_mobileNumber
    customerData.password = this.encrypt(this.Sign_up_password)
    let data = {
      data:customerData
    }
    customer_points.available_points = 0
    customer_points.total_points = 0
    customer_points.customer_detail= data
    
    console.log("deycript-number-", this.decrypt( customerData.mobile_number))
    this.customerService.createCustomerDetailsWithPoints(customer_points).subscribe(
         (result: any) => {


          if (result.errors&&result.errors.length>0) {
            this.errorOccurredBanner = true;
            this.showSpinner = false;
          
          } else
          {
            this.triggerRegistrationSuccessMail(customerData);
            this.clearAllBanners()
            this.showSignUpSuccessBanner = true
            this.showSpinner = false;
          }

       
        //this.SaveUserToSessionStorage(result.data.insert_kubera_employee_login_one);
        
         },
               (error: any) => {
        this.clearAllBanners()
        this.errorOccurredBanner = true;
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      }
    )

    // this.graphqlService.createEmployeeLogin(customerData).subscribe(
    //   (result: any) => {
    //     this.clearAllBanners()
    //     this.showSignUpSuccessBanner = true
    //     this.showSpinner = false;
    //     this.SaveUserToSessionStorage(result.data.insert_kubera_employee_login_one);
    //   },
    //   (error: any) => {
    //     this.clearAllBanners()
    //     this.errorOccurredBanner = true;
    //     this.showSpinner = false;
    //     console.error('Error fetching data:', error);
    //   }
    // );
  }
  triggerRegistartionSucessMail() {
    throw new Error('Method not implemented.');
  }

  clearAllBanners() {
    this.showSignUpSuccessBanner = false;
    this.errorOccurredBanner = false;
    this.showSignUpOtpBanner = false;
    this.showError = false;
    this.showEmailIdNotFOundError=false
    this.loginSessionExpiredBanner =false
    this.loginShowErrorBanner=false
    this.showRenewOtpBanner = false;
    this.showRenewSuccessBanner=false
  }
  backToSignup() {
    this.clearAllBanners();
    this.showOtpPannel = false
  }
  private key = ENCRYPT_KEY; // Replace with your desired key

  encrypt(data: string): string {
    const encryptedData = CryptoJS.AES.encrypt(data, this.key).toString();
    const base64EncodedData = btoa(encryptedData);
    return base64EncodedData;
  }

  decrypt(encryptedData: string): string {
    const base64DecodedData = atob(encryptedData);
    const decryptedData = CryptoJS.AES.decrypt(base64DecodedData, this.key).toString(CryptoJS.enc.Utf8);
    return decryptedData;
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
    this.Sign_up_email_id = "";
    this.Sign_up_mobileNumber= "";
    this.sign_in_username= "";
    this.sign_in_password= "";
   this.renew_up_username = "";
   this.reset_password = "";   
   this.renew_up_otp = "";
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
      // //call api
      // this.customerService.getEmployeeLoginDetailsByUserName(this.sign_in_username).subscribe(
      //   (result: any) => {
      //     this.clearAllBanners()
      //     this.showSignUpSuccessBanner = true
      //     this.showSpinner = false;
      //     if(result.data.kubera_employee_login[0] != undefined)
      //     {
      //       this.SaveUserToSessionStorage(result.data.kubera_employee_login[0]);
      //       this.loginCap();
      //     }else
      //     {
      //       this.loginShowErrorBanner = true;
      //     }
          
      //   },
      //   (error: any) => {
      //     this.loginShowErrorBanner = true
      //     this.showSpinner = false
      //   }
      // );
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

  sendPasswordResetOtp(){
    this.clearAllBanners()
    this.showSpinner  =true
    this.renew_generated_otp = Math.floor(Math.random() * 9000) + 1000;
    //check for the emailid exist
    this.customerService.getCustomerDetailsByEmail(this.renew_up_username).subscribe( 
      (result: any) => {
        if (result.data.kubera_profile_customer_points.length>0) {
          this.sendRenewOtpThroughMail(this.renew_generated_otp, this.renew_up_username);
          this.showRenewOtpPannel = true
        }
        else
        {
          this.showEmailIdNotFOundError = true
        }
        this.showSpinner  =false
      }
    )

   
  }


  updateCustomerPasswordTime() {
    this.clearAllBanners();
    let isUserValid = this.validateRenewUser();
    if (isUserValid) {
      this.updateCustomerPasswordUpdate()
    }

  }


  updateCustomerPasswordUpdate() {
    this.clearAllBanners();
    this.showSpinner = true;
    let encrypt_password = this.encrypt(this.reset_password);
    this.customerService.updateCustomerDetailsByEmail(this.renew_up_username, encrypt_password).subscribe(
      (result: any) => {
        if(result.data.update_kubera_profile_customer_details.affected_rows>0){
          this.showRenewSuccessBanner = true
          
        }
        else{
          this.renewErrorOccurredBanner = true
        }
        this.showSpinner = false;
      }
    )
  }

  backToRestPage() {
    this.showRenewOtpPannel = false
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
    // this.customerService.updateEmployeeRenewDetailsByUserName(renew_username,renew_date).subscribe(
    //   (result: any) => {
    //     this.clearAllBanners()
       
    //     this.showSpinner = false;
    //     if(result.data.update_kubera_employee_login.returning[0] != undefined)
    //       {
    //         this.showRenewSuccessBanner = true
    //       localStorage.removeItem('cap_user')
    //       }else
    //       {
    //         this.renewErrorOccurredBanner = true;
    //       }
    //   },
    //   (error: any) => {
    //     this.clearAllBanners()
    //     this.renewErrorOccurredBanner = true;
    //     this.showSpinner = false;
    //     console.error('Error fetching data:', error);
    //   }
    // );
  }


  loginCustomer() {
    // sign_in_username is used as mobile number
    this.showSpinner = true;
    this.loginShowErrorBanner = false
    //console.log("decoder - ", this.decrypt(this.sign_in_password))
    this.customerService.getCustomerPointAndDetailsByNumber(this.sign_in_username).subscribe(

      (result: any) => {


       if (result.data.kubera_profile_customer_points.length>0) {
        if(this.ValidatePassword(result.data.kubera_profile_customer_points[0].customer_detail.password, this.sign_in_password))
        {
          this.clearAllBanners()
          
          result.data.kubera_profile_customer_points[0].customer_detail.password = undefined;
          sessionStorage.setItem("is_login","true");
          sessionStorage.setItem("customer_Details",JSON.stringify(result.data.kubera_profile_customer_points[0]));
          this.sharedService.setIsLoginFlag(true);
          this.loginStatus.emit(true);
          this.showSpinner = false;
        }
        else
        {
          this.loginShowErrorBanner = true;
          this.showSpinner = false;
        }
      
       
       } else
       {
        // this.triggerRegistrationSuccessMail(customerData);
        this.loginShowErrorBanner = true;
        this.showSpinner = false;
       }
     
      },
            (error: any) => {
     this.clearAllBanners()
     this.errorOccurredBanner = true;
     this.showSpinner = false;
     console.error('Error fetching data:', error);
   })
  }

  ValidatePassword(dBPassword:any, userPassword:any)
  {
      let depcrypt_dbPassword= this.decrypt(dBPassword)
      if(depcrypt_dbPassword == userPassword)
      {
        return true;
      }else
      {
        return false;
      }
  }
}
