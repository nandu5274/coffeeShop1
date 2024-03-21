import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { CartItemDto } from "../dtos/CartItemDto";
import * as Papa from 'papaparse';
import { ResponseDto } from "../dtos/responseDto";
import { Router } from "@angular/router";

@Injectable()
export class SharedService {


  constructor(private router: Router) { }
  previousUrl: any;

    private sendItemToCart: CartItemDto = new CartItemDto;
    private sendItemToCartSubject = new Subject<CartItemDto>();

    private showMenu: any = false;
    private showMenuSubject = new Subject<any>();


    private orderProcessingResponse: ResponseDto = new ResponseDto;
    private orderProcessingResponseSubject = new Subject<ResponseDto>();
  
    setItemToCartData(data: CartItemDto) {
      this.sendItemToCart = data;
      this.sendItemToCartSubject.next(data);
    }
  
    getItemToCartData() {
      return this.sendItemToCart;
    }
    getItemToCartDataObservable() {
      return this.sendItemToCartSubject.asObservable();
    }

    setShowMenuFlag(data: any) {
      this.showMenu = data;
      this.showMenuSubject.next(data);
    }
  
     
    getShowMenuFlagData() {
      return this.showMenu;
    }
    getShowMenuFlagDataObservable() {
      return this.showMenuSubject.asObservable();
    }
     
    setOrderProcessingResponse(data: ResponseDto) {
      this.orderProcessingResponse = data;
      this.orderProcessingResponseSubject.next(data);
    }
  
    getOrderProcessingResponse() {
      return this.orderProcessingResponse;
    }
  
    getOrderProcessingResponseObservable() {
      return this.orderProcessingResponseSubject.asObservable();
    }
  
    generateRandomNumberWithDateTime(): number {
      // Get the current timestamp in milliseconds
      const currentTimestamp = new Date().getTime();
  
      // Combine the timestamp with Math.random to generate a random number
      const randomNumber = Math.floor((currentTimestamp + Math.random()) * 1000); // Adjust the range as needed
  
      return randomNumber;
    }


navigateToMenu(nav:any) {
  
  if(nav=='menu')
  {
    this.router.navigate(['/' + nav], { fragment: nav });
   const elements = document.querySelectorAll(`[href="#hero"], [href="#about"], [href="#specials"], [href="#events"], [href="#chefs"], [href="#gallery"]`);
   elements.forEach((element) => {
    element.classList.remove('active');
  });
  this.previousUrl = sessionStorage.getItem("previousUrl");
  sessionStorage.setItem("previousUrl", nav);
  }
  else if(sessionStorage.getItem("previousUrl") == 'menu'){
    this.router.navigate(['/'], { fragment: nav }) .then(() => {
      window.location.reload();
    });
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }else
  {
    this.router.navigate(['/'], { fragment: nav })
    this.previousUrl = sessionStorage.getItem("previousUrl");
  
    sessionStorage.setItem("previousUrl", nav);
  }
}


 async parseNestedCsvToObject(blob: Blob): Promise<{ headers1: Record<string, string>, headers2: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event:any) => {
      const csvData = event.target.result as string;
      const cleanedCsvData = csvData.replace(/\r/g, '');

      const lines = cleanedCsvData.split('\n');

   

      // Extract the headers from the first and third lines
      const headers1: string[] = lines[0].split(',');
      const headers2: string[] = lines[2].split(',');

      // Extract the data from the second line
      const data1: string[] = lines[1].split(',');

      // Process the lines from the 4th line to the end
      const data2: Record<string, string>[] = [];

      lines.slice(3).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers2.forEach((header, index) => {
          item[header] = values[index];
        });
        data2.push(item);
      });

      if (headers1.length !== data1.length) {
        console.error('CSV parsing error: Header and data length mismatch for headers1');
        reject('CSV parsing error');
        return;
      }

      // Convert headers1 to an object
      const headers1Obj: Record<string, string> = {};
      for (let i = 0; i < headers1.length; i++) {
        headers1Obj[headers1[i]] = data1[i];
      }

      resolve({ headers1: headers1Obj, headers2: data2 });
    };
    reader.readAsText(blob);
  });
}


async parseNestedCsvToObjectDynamicHeader(blob: Blob): Promise<{ headers1: Record<string, string>[], headers2: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event:any) => {
      const csvData = event.target.result as string;
      const cleanedCsvData = csvData.replace(/\r/g, '');

      const lines = cleanedCsvData.split('\n');

      // Find the line number for headers1
      const headerLine1 = lines.findIndex(line => line.includes('order_summary_amount')) + 1;

      // Find the line number for headers2
      const headerLine2 = lines.findIndex(line => line.includes('item_description')) + 1;

      // Extract the headers from the first and third lines
      const headers1: string[] = lines[headerLine1 - 1].split(',');
      const headers2: string[] = lines[headerLine2 - 1].split(',');

      // Extract the data from the second line
      const data1: Record<string, string>[] = [];

      // Process the lines from the 4th line to the end
      const data2: Record<string, string>[] = [];

      lines.slice(headerLine2).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers2.forEach((header, index) => {
          item[header] = values[index];
        });
        data2.push(item);
      });

      lines.slice(headerLine1, headerLine2-1).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers1.forEach((header, index) => {
          item[header] = values[index];
        });
        data1.push(item);
      });


      // if (headers1.length !== data1.length) {
      //   console.error('CSV parsing error: Header and data length mismatch for headers1');
      //   reject('CSV parsing error');
      //   return;
      // }



      resolve({ headers1: data1, headers2: data2 });
    };
    reader.readAsText(blob);
  });
}




async parseNestedCsvToObjectDynamic3THeader(blob: Blob): Promise<{ headers1: Record<string, string>[], headers2: Record<string, string>[], headers3: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event:any) => {
      const csvData = event.target.result as string;
      const cleanedCsvData = csvData.replace(/\r/g, '');

      const lines = cleanedCsvData.split('\n');

      // Find the line number for headers1
      const headerLine1 = lines.findIndex(line => line.includes('order_summary_amount')) + 1;

      // Find the line number for headers2
      const headerLine2 = lines.findIndex(line => line.includes('item_description')) + 1;

      const headerLine3 = lines.findIndex(line => line.includes('paid_amount')) + 1;

      // Extract the headers from the first and third lines
      const headers1: string[] = lines[headerLine1 - 1].split(',');
      const headers2: string[] = lines[headerLine2 - 1].split(',');
      const headers3: string[] = lines[headerLine3 - 1].split(',');

      // Extract the data from the second line
      const data1: Record<string, string>[] = [];

      // Process the lines from the 4th line to the end
      const data2: Record<string, string>[] = [];

      // Process the lines from the 4th line to the end
      const data3: Record<string, string>[] = [];

      lines.slice(headerLine2).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers2.forEach((header, index) => {
          item[header] = values[index];
        });
        data2.push(item);
      });

      lines.slice(headerLine1, headerLine2-1).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers1.forEach((header, index) => {
          item[header] = values[index];
        });
        data1.push(item);
      });


      lines.slice(headerLine3, headerLine1-1).forEach(line => {
        const values = line.split(',');
        const item: Record<string, string> = {};
        headers3.forEach((header, index) => {
          item[header] = values[index];
        });
        data3.push(item);
      });




      // if (headers1.length !== data1.length) {
      //   console.error('CSV parsing error: Header and data length mismatch for headers1');
      //   reject('CSV parsing error');
      //   return;
      // }



      resolve({ headers1: data1, headers2: data2, headers3:data3 });
    };
    reader.readAsText(blob);
  });
}




 readBlobAsText(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event!.target!.result as string;
      resolve(text);
    };
    reader.onerror = (event) => {
      reject(event);
    };
    reader.readAsText(blob);
  });
}

 readBlobAsObjects(blob: Blob): Observable<any[]> {
  return new Observable<any[]>((observer) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event!.target!.result as string;
      const parsedData = Papa.parse(text, { header: true }).data;
      observer.next(parsedData);
      observer.complete();
    };
    reader.onerror = (event) => {
      observer.error(event);
    };
    reader.readAsText(blob);
  });
}

parseCsvText(csvText: string): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve(result.data);
      },
      error: (error: any) => {
        reject(error);
      },
    });
  });
}


updateCurrentDateTimeInIST() {
  let istTime:any
  const localTime = new Date();

  // Check if the current time is in IST
 let isCurrentTimeInIST = this.isTimeInIST(localTime);

  // Convert to IST if not in IST
  if (!isCurrentTimeInIST) {
    istTime= this.convertToIST(localTime);
  }
  else
  {
    istTime = localTime.toLocaleString();
  }

  let formattedTime = this.formatDateTime(istTime);

  return formattedTime;
}

isTimeInIST(date: Date): boolean {
  // Check if the time zone is 'Asia/Kolkata' (IST)
  return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }) === date.toLocaleString();
}

convertToIST(date: Date): string {
  // Convert to IST (Asia/Kolkata)
  return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
}


convertToIST12(date: Date): string {
  const options = {
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  };
  
  // Convert to IST (Asia/Kolkata)
  return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata',  hour12: true  });
}



formatDateTime(dateString: string): string {
  const options = {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    hour: 'numeric' as const,
    minute: 'numeric' as const,
    second: 'numeric' as const,
    hour12: true,
  };

  let formattedDate = new Date(dateString.toString()).toLocaleString('en-US', options);
  formattedDate = formattedDate.replace(',', '-').replace(/\//g, '-');
  const withoutSpaces = formattedDate.replace(/[ ,\/]/g, '-');
  return withoutSpaces;
}



formatDate(dateString: string): string {
  const options = {
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
 
  };

  let formattedDate = new Date(dateString.toString()).toLocaleString('en-US', options);
  formattedDate = formattedDate.replace(',', '-').replace(/\//g, '-');
  const withoutSpaces = formattedDate.replace(/[ ,\/]/g, '-');
  return withoutSpaces;
}

updateCurrentDateInIST() {
  let istTime:any
  const localTime = new Date();

  // Check if the current time is in IST
 let isCurrentTimeInIST = this.isTimeInIST(localTime);

  // Convert to IST if not in IST
  if (!isCurrentTimeInIST) {
    istTime= this.convertToIST(localTime);
  }
  else
  {
    istTime = localTime.toLocaleString();
  }

  let formattedTime = this.formatDate(istTime);

  return formattedTime;
}


updateCurrentDateInIST12() {
  let istTime:any
  const localTime = new Date();

  // Check if the current time is in IST
 let isCurrentTimeInIST = this.isTimeInIST(localTime);

  // Convert to IST if not in IST
  if (!isCurrentTimeInIST) {
    istTime= this.convertToIST12(localTime);
  }
  else
  {
    istTime = localTime.toLocaleString();
  }

  let formattedTime = this.formatDate(istTime);

  return formattedTime;
}


 convertDateTimeToDateString(datetimeString:any) {
  var parts1 = datetimeString.split("--");
    
    // Extract date and time components
    var datePart = parts1[0];
    


    const parts = datePart.split('-');

    // Rearrange the components to match the desired format
    const formattedDateString = parts[1] + '-' + parts[0] + '-' + parts[2];

    return formattedDateString;
   
}

}