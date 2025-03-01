import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
@Component({
  selector: 'app-admin-payment-form',
  templateUrl: './admin-payment-form.component.html',
  styleUrls: ['./admin-payment-form.component.scss']
})
export class AdminPaymentFormComponent {
 @Input() isVisible = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() fromData = new EventEmitter<any>();
  adminForm!:FormGroup;
  todayDate:any;
  constructor(private fb: FormBuilder) { }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible']) {
      this.ngOnInit();
    }
  }
  ngOnInit(): void {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
     this.todayDate = new Date().toISOString().split('T')[0];
    this.adminForm = this.fb.group({
      amount: [null, ],
     
      company_name: ['Bharath'],
   
      payment_date: [null ],
      payment_type: ['PhonePay' ],
     
      month: [currentMonth],
      year: [currentYear],
    });
   
  }

  onSubmit(): void {
    if (this.adminForm.valid) {
      
   //   console.log(this.adminForm.value);
      
      const value = this.adminForm.value;
      
      this.fromData.emit({...value}) ;
      this.onCancel();
    }
  }

  onCancel(): void {
    this.adminForm.reset();
    this.isVisible = false;
    this.cancel.emit(); // Emit the cancel event
  }
}
