import { Component } from '@angular/core';
import { KUBERA_PUBLIC_PROFILE_LOGIN_PASSWORD, KUBERA_PUBLIC_PROFILE_LOGIN_USER_NAME } from '../common/constanst';
import { CustomerService } from '../service/customer.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {

  showSpinner: boolean = false;
  showPassword: boolean = false;
  username: string = '';
  password: string = '';
  showError: boolean = false;
  noProfileError: boolean = false;
  isLoginFlag: boolean = false;
  customerNumber: string = '';
  customerDetails: any = {};
  profileFound: boolean = false;
  constructor(private customerService: CustomerService) { }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (this.username === KUBERA_PUBLIC_PROFILE_LOGIN_USER_NAME && this.password === KUBERA_PUBLIC_PROFILE_LOGIN_PASSWORD) {
      this.isLoginFlag = true;
    } else {
      this.showError = true;
    }

  }

  clearBanners()
  {
    this.showError = false;
    this.noProfileError = false;
   
  }
  CheckProfile()
  {
    this.profileFound = false;
    this.clearBanners();
    this.showSpinner = true;
    this.customerService.getCustomerMemberShipDetailsByNUmber(this.customerNumber).subscribe(

      (result: any) => {


        if (result.data.kubera_profile_customer_member_ship.length > 0) {
          this.profileFound = true;
          this.showSpinner = false;
          this.customerDetails = result.data.kubera_profile_customer_member_ship[0];
         let status= this.calculateMembershipStatus(this.customerDetails);
         this.customerDetails.status = status;
        } else {
          this.noProfileError = true;
          this.showSpinner = false;
        }

      },
      (error: any) => {
        this.clearBanners()
      
        this.showSpinner = false;
        console.error('Error fetching data:', error);
      })
  }

  calculateMembershipStatus(customer_detail:any)
  {
    let expiryDateParts = customer_detail.expiry_date.split("-");
let expiryDate = new Date(expiryDateParts[0], expiryDateParts[1] - 1, expiryDateParts[2]);
    let today = new Date();
    today.setHours(0, 0, 0, 0); // set time to midnight
    expiryDate.setHours(0, 0, 0, 0); // set time to midnight
    
    if (expiryDate >= today) {
      return "Active";
    } else {
      return "Expired";
    }
  }

}
