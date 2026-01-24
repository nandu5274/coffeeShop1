import { Component, OnInit } from '@angular/core';
import { KUBERA_PUBLIC_PROFILE_LOGIN_PASSWORD, KUBERA_PUBLIC_PROFILE_LOGIN_USER_NAME } from '../common/constanst';
import { CustomerService } from '../service/customer.service';
import { ActivatedRoute, Router } from '@angular/router';
@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.scss']
})
export class CustomerProfileComponent  implements OnInit  {

  showSpinner: boolean = false;
  showPassword: boolean = false;
  username: string = '';
  password: string = '';
  showError: boolean = false;
  noProfileError: boolean = false;
  isLoginFlag: boolean = false;
  customerNumber: string = '';
  customerDetails: any = {};
  customer_points: any = {};
  memberShipDetails: any = {};
  profileFound: boolean = false;
  constructor(private customerService: CustomerService, private router: Router, private route: ActivatedRoute) { }
  data: any;
  ngOnInit() {
    let data:any = '';
    this.route.queryParams.subscribe(params => {
       data = atob(params['data']); // Decode the data
      console.log('Received Data:', data);
    });

    if (data !== '') {
      this.customerNumber = data;
   this.CheckProfile();
    } else
    {
      this.noProfileError = true;
    }

  }
 

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

  convertTimestampToDate(customerDetails: any) {
   

// Convert to Date object
const utcDate = new Date(customerDetails.created_at);


// IST offset is +5:30 => 330 minutes
const istOffsetMinutes = 330;
const istDate = new Date(utcDate.getTime() + istOffsetMinutes * 60 * 1000);

// Extract only the date in yyyy-MM-dd format
const year = istDate.getFullYear();
const month = String(istDate.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
const day = String(istDate.getDate()).padStart(2, '0');
// Format as ISO string with IST offset
const formattedDate = `${year}-${month}-${day}`;
return formattedDate;
  }
  convertedDate:any;
  CheckProfile()
  {
    this.profileFound = false;
    this.clearBanners();
    this.showSpinner = true;
    this.customerService.getCustomerDetailsWithPointsAndMemberShipByNumber(this.customerNumber).subscribe(

      (result: any) => {


        if (result.data.kubera_profile_customer_details.length > 0) {
          this.profileFound = true;
          this.showSpinner = false;
          this.customerDetails = result.data.kubera_profile_customer_details[0];
          this.customer_points = this.customerDetails.customer_points[0];
         this.convertedDate = this.convertTimestampToDate(this.customerDetails);
          let membship = result.data.kubera_profile_customer_details[0].customer_member_ship;
          if(membship != null)
          {
            this.memberShipDetails = membship;
            let status= this.calculateMembershipStatus(this.memberShipDetails);
            this.customerDetails.status = status;
          }else{  
            this.customerDetails.status = "No Membership";
          }
         
     
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
