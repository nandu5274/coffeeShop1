import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin-form',
  templateUrl: './admin-form.component.html',
  styleUrls: ['./admin-form.component.scss']
})
export class AdminFormComponent implements OnInit{
  @Input() isVisible = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() fromData = new EventEmitter<any>();
  adminForm!:FormGroup;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.adminForm = this.fb.group({
      amount: [null, Validators.required],
     
      company_name: ['', Validators.required],
   
      generated_date: [null, Validators.required],
      invoice_number: ['', Validators.required],
     
      use_month: ['', Validators.required],
      use_year: [null, Validators.required],
    });
   
  }

  onSubmit(): void {
    if (this.adminForm.valid) {
      
      console.log(this.adminForm.value);
      
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
