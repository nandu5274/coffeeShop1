import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';

@Pipe({
  name: 'timeAgo',
  pure: false,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string, timerObservable: Observable<number>): string {
    if (!value) return value;

    const currentTime = new Date();
    const dateFormat = value;
    const parts = value.match(/(\d+)/g);
    const year = parseInt(parts![0]);
    const month = parseInt(parts![1]) - 1; // Note: months are 0-based
    const day = parseInt(parts![2]);
    let hour = parseInt(parts![3]);
    const minute = parseInt(parts![4]);
    const second = parseInt(parts![5]);
    
    // Determine if it's AM or PM
    const isAM = value.includes("AM");
    
    // Adjust hour for PM
    if (!isAM && hour !== 12) {
        hour += 12;
    }
    
    // Create Date object
    const createdTime = new Date(year, month, day, hour, minute, second);
   // const createdTime = new Date(value);
    const differenceInSeconds = Math.floor((currentTime.getTime() - createdTime.getTime()) / 1000);

    if (differenceInSeconds < 60) {
      return `${differenceInSeconds} seconds ago`;
    } else if (differenceInSeconds < 3600) {
      const minutes = Math.floor(differenceInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (differenceInSeconds < 86400) {
      const hours = Math.floor(differenceInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(differenceInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
}