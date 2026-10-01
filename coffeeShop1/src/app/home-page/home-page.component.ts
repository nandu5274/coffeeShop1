import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { SharedService } from '../service/shared-service';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../service/data.service';
import { HasuraApiService } from '../service/hasura.api.service';
import { BookingForm } from '../dtos/bookingForm';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';
import emailjs from '@emailjs/browser';
import {
  DELIVERY_HOME_BUTTON_ENABLED,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  EMAILJS_PUBLIC_KEY,
  CAFE_RECEIVING_EMAIL,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID
} from '../common/constanst';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit, AfterViewInit {

  private hasReloaded = false;
  readonly deliveryHomeButtonEnabled = DELIVERY_HOME_BUTTON_ENABLED;
  readonly cafeEmail = CAFE_RECEIVING_EMAIL;

  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private location: Location,
    private sharedService: SharedService,
    private dataService: HasuraApiService,
    private simpleMailService: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  showMenu:any = this.sharedService.getShowMenuFlagData();
  showSpinner:any = true;
  ngOnInit() {
    setTimeout(() => {
      this.showSpinner = false;
    }, 1000);

    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.scrollToFragment(fragment);
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.showMenu = this.sharedService.getShowMenuFlagData();
  
      this.sharedService.getShowMenuFlagDataObservable().subscribe((data) => {
        this.showMenu = data;
      });

      if (this.route.snapshot.fragment) {
        this.scrollToFragment(this.route.snapshot.fragment);
      }
    }, 150);
  }

  private scrollToFragment(fragment: string) {
    setTimeout(() => {
      const el = document.getElementById(fragment);
      if (el) {
        const header = document.getElementById('header');
        const offset = header ? header.offsetHeight : 0;
        const elementPos = el.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPos - offset,
          behavior: 'smooth'
        });
      }
    }, 250);
  }

  navigateToMenu(menu: any) {
    this.scrollToFragment(menu);
    this.sharedService.navigateToMenu(menu);
  }

  navigateToDelivery() {
    sessionStorage.setItem('order_mode', 'delivery');
    this.router.navigate(['/delivery']);
  }


  bookingForm: BookingForm = {
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    people: 1,
    message: ''
  };

  openPicker(inputEl: HTMLInputElement) {
    if (inputEl && typeof inputEl.showPicker === 'function') {
      try {
        inputEl.showPicker();
      } catch (e) {
        // Fallback for browsers with strict gesture policies
      }
    }
  }

  formatTimeWithAmPm(timeStr: string): string {
    if (!timeStr) return '';
    const upperStr = timeStr.trim().toUpperCase();
    if (upperStr.includes('AM') || upperStr.includes('PM')) {
      return upperStr;
    }
    const parts = upperStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hoursFormatted = hours < 10 ? '0' + hours : '' + hours;
    return `${hoursFormatted}:${minutes} ${ampm}`;
  }

  isTimeWithinOpeningHours(timeStr: string): boolean {
    if (!timeStr) return false;
    let hours = 0;
    let minutes = 0;
    const upperStr = timeStr.trim().toUpperCase();
    if (upperStr.includes('AM') || upperStr.includes('PM')) {
      const isPm = upperStr.includes('PM');
      const cleanStr = upperStr.replace('AM', '').replace('PM', '').trim();
      const parts = cleanStr.split(':');
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return false;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    } else {
      const parts = upperStr.split(':');
      if (parts.length < 2) return false;
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return false;
    }
    const totalMinutes = hours * 60 + minutes;
    const openingTime = 9 * 60;   // 09:00 AM (540 mins)
    const closingTime = 23 * 60;  // 11:00 PM (1380 mins)
    return totalMinutes >= openingTime && totalMinutes <= closingTime;
  }

  sendBookingEmail(form: NgForm) {
    if (form.invalid) {
      this.submitError = 'Please fill out all required fields before confirming.';
      return;
    }

    if (!this.isTimeWithinOpeningHours(this.bookingForm.time)) {
      this.submitError = 'Please select a time between 09:00 AM and 11:00 PM (Cafe Opening Hours).';
      return;
    }

    this.isSubmitting = true;
    this.submitSuccess = false;
    this.submitError = '';

    const formattedTime = this.formatTimeWithAmPm(this.bookingForm.time);

    const payload = {
      name: this.bookingForm.name,
      email: this.bookingForm.email,
      phone: this.bookingForm.phone,
      date: this.bookingForm.date,
      time: formattedTime,
      people: this.bookingForm.people,
      message: this.bookingForm.message || 'No special message'
    };

    // 1. Real Email Dispatch to Cafe (cafekubera2223@gmail.com) via Serverless Mail API
    const cafeEmailPayload = {
      recipient: CAFE_RECEIVING_EMAIL,
      subject: `New Table Reservation Request from ${payload.name}`,
      msgBody: `Hello Cafe Kubera Team,\n\nA new table reservation request has been received from the website:\n\n` +
        `• Name: ${payload.name}\n` +
        `• Email: ${payload.email}\n` +
        `• Phone: ${payload.phone}\n` +
        `• Date: ${payload.date}\n` +
        `• Time: ${payload.time}\n` +
        `• Guests: ${payload.people}\n` +
        `• Special Request: ${payload.message}\n\n` +
        `Please call or email the customer back to confirm their reservation.`
    };

    this.simpleMailService.SendSimpleMail(cafeEmailPayload).subscribe({
      next: (res) => console.log('Cafe reservation email sent:', res),
      error: (err) => console.warn('Cafe email send error:', err)
    });

    // 2. Real Email Dispatch to Customer Confirmation
    if (payload.email) {
      const customerEmailPayload = {
        recipient: payload.email,
        subject: `Table Reservation Received - Cafe Kubera`,
        msgBody: `Dear ${payload.name},\n\nThank you for choosing Cafe Kubera! We have received your table reservation request:\n\n` +
          `• Date: ${payload.date}\n` +
          `• Time: ${payload.time}\n` +
          `• Guests: ${payload.people}\n\n` +
          `Our team will contact you shortly on ${payload.phone} to confirm your table.\n\n` +
          `Warm regards,\nCafe Kubera Team\n3rd line, near Guru Nanak Colony, Vijayawada\nContact: 9652544239`
      };

      this.simpleMailService.SendSimpleMail(customerEmailPayload).subscribe({
        next: (res) => console.log('Customer confirmation email sent:', res),
        error: (err) => console.warn('Customer email send error:', err)
      });
    }

    // 3. EmailJS Dispatch if configured
    if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
      emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: payload.name,
          from_email: payload.email,
          phone: payload.phone,
          booking_date: payload.date,
          booking_time: payload.time,
          people_count: payload.people,
          message: payload.message,
          to_email: CAFE_RECEIVING_EMAIL
        },
        EMAILJS_PUBLIC_KEY
      ).catch((err) => console.warn('EmailJS error:', err));
    }

    // Complete loading state & display success feedback
    setTimeout(() => {
      this.isSubmitting = false;
      this.submitSuccess = true;
      form.resetForm({ people: 1 });
    }, 600);
  }

  sendMailtoFallback() {
    const subject = encodeURIComponent(`Table Reservation - ${this.bookingForm.name || 'Guest'}`);
    const body = encodeURIComponent(
      `Hi Cafe Kubera Team,\n\nI would like to reserve a table:\n` +
      `- Name: ${this.bookingForm.name}\n` +
      `- Email: ${this.bookingForm.email}\n` +
      `- Phone: ${this.bookingForm.phone}\n` +
      `- Date: ${this.bookingForm.date}\n` +
      `- Time: ${this.bookingForm.time}\n` +
      `- Guests: ${this.bookingForm.people}\n` +
      `- Message: ${this.bookingForm.message}\n`
    );
    window.open(`mailto:${CAFE_RECEIVING_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  }

}

