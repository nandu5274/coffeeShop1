import { Component } from '@angular/core';

@Component({
  selector: 'app-membership-card',
  templateUrl: './membership-card.component.html',
  styleUrls: ['./membership-card.component.scss']
})
export class MembershipCardComponent {
  rotationStyle: string = 'rotateX(0deg) rotateY(0deg)'; // Default rotation
  isClicked: boolean = false;

  // Store initial orientation values
  alpha: number = 0;
  beta: number = 0;
  gamma: number = 0;
  lastTouchX: number = 0;
  lastTouchY: number = 0;
  // Scaling factor to slow down the gyroscope rotation
  gyroScale: number = 0.2; // You can adjust this value to control the sensitivity (0.2 means 5x slower)

  // Threshold to detect "upright" position
  uprightThreshold: number = 15; // Degrees: Within ±15 degrees of upright (0 beta, 0 gamma)

  // Initialize the gyroscope listener
  ngOnInit() {
    if (window.DeviceOrientationEvent) {
     // window.addEventListener('deviceorientation', this.onDeviceOrientation.bind(this), true);
    } else {
      console.log('Device Orientation not supported');
    }
  }

  // Gyroscope event handler
  onDeviceOrientation(event: DeviceOrientationEvent) {
    // Get the device's orientation data
    this.alpha = event.alpha ? event.alpha : 0; // Rotation around Z-axis (left-right)
    this.beta = event.beta ? event.beta : 0;   // Rotation around X-axis (forward-backward)
    this.gamma = event.gamma ? event.gamma : 0; // Rotation around Y-axis (tilt left-right)

    // Apply scaling factor to slow down the rotation
    const xRotate = this.beta * this.gyroScale;  // Use the beta value to rotate around the X-axis
    const yRotate = -this.gamma * this.gyroScale; // Use the gamma value to rotate around the Y-axis

    // Check if the phone is facing the user (near upright position)
    if (Math.abs(this.beta) < this.uprightThreshold && Math.abs(this.gamma) < this.uprightThreshold) {
      // If the phone is near upright, reset the rotation
      this.rotationStyle = `rotateX(0deg) rotateY(0deg)`;
    } else {
      // Else, apply the calculated rotation
      this.rotationStyle = `rotateX(${xRotate}deg) rotateY(${yRotate}deg)`;
    }
  }

  // Mouse move logic (already provided by you)
  onMouseMove(event: MouseEvent) {
    if (this.isClicked) return; // Ignore mouse movement if the card is clicked

    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Normalize mouse position (from 0 to 1) relative to card's dimensions
    const xNormalized = x / rect.width;
    const yNormalized = y / rect.height;

    // Map normalized values to a 360-degree rotation range
    const xRotate = (yNormalized - 0.5) * 360; // Full rotation in X-axis
    const yRotate = (xNormalized - 0.5) * -360; // Full rotation in Y-axis

    this.rotationStyle = `rotateX(${xRotate}deg) rotateY(${yRotate}deg)`;
  }

  // Mouse click logic (already provided by you)
  onClick() {
    this.isClicked = !this.isClicked;

    // Toggle rotation on click
    if (this.isClicked) {
      this.rotationStyle = `rotateY(180deg)`; // Rotate the card 180 degrees
    } else {
      this.rotationStyle = ''; // Reset rotation
    }
  }

  // Mouse leave logic (already provided by you)
  onMouseLeave() {
    this.rotationStyle = 'rotateX(0deg) rotateY(0deg)'; // Reset to initial state
  }

  // Touch start event
  onTouchStart(event: TouchEvent) {
    if (this.isClicked) return; // Ignore touch movement if the card is clicked

    // Store initial touch position
    this.lastTouchX = event.touches[0].clientX;
    this.lastTouchY = event.touches[0].clientY;
  }

  // Touch move event (with swipe logic)
  onTouchMove(event: TouchEvent) {
    if (this.isClicked) return; // Ignore touch movement if the card is clicked

    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
  
    // Get the current touch position
    const touchX = event.touches[0].clientX - rect.left;
    const touchY = event.touches[0].clientY - rect.top;
  
    // Normalize touch position (from 0 to 1) relative to card's dimensions
    const xNormalized = touchX / rect.width;
    const yNormalized = touchY / rect.height;
  
    // Map normalized values to a 360-degree rotation range
    const xRotate = (yNormalized - 0.5) * 360; // Full rotation in X-axis
    const yRotate = (xNormalized - 0.5) * -360; // Full rotation in Y-axis
  
    // Update the rotation style with backticks for string interpolation
    this.rotationStyle = `rotateX(${xRotate}deg) rotateY(${yRotate}deg)`;
  
    // Prevent default behavior to avoid scrolling or zooming
    event.preventDefault();
  }

  // Touch end event (reset when touch ends)
  onTouchEnd() {
    this.rotationStyle = 'rotateX(0deg) rotateY(0deg)'; // Reset to initial state
  }

  // Cleanup the event listener when the component is destroyed
  ngOnDestroy() {
    if (window.DeviceOrientationEvent) {
      window.removeEventListener('deviceorientation', this.onDeviceOrientation.bind(this), true);
    }
  }
}