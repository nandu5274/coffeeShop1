import { Injectable } from '@angular/core';
import { Dropbox } from 'dropbox';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as Papa from 'papaparse';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class DropboxService {
  private dbx!: Dropbox;
  constructor(private http: HttpClient) {
    this.exchangeAuthorizationCodeForAccessToken();
  }

  // uploadFile(filePath: string, fileContent: string) {
  //   this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
  //   return this.dbx.filesUpload({ path: filePath, contents: fileContent });
  // }

  // updateFile(filePath: string, fileContent: string)
  // {
  //   this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
  //   return this.dbx.filesUpload({
  //     path: filePath,
  //     contents: fileContent,
  //     mode: { '.tag': 'overwrite' }, // Overwrite the file
  //   });
  // }
  // async getFilesInFolder(folderPath: string) {
  //   this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
  //   try {
  //     const response = await this.dbx.filesListFolder({ path: folderPath });
  //     return response.result.entries;
  //   } catch (error) {
  //     console.error('Error listing files in the folder', error);
  //     throw error;
  //   }


  // }

  // async getFileData(filePath: string) {
  //   this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
  //   try {
  //     const response = await this.dbx.filesDownload({ path: filePath });
  //     return response.result;
  //   } catch (error) {
  //     console.error('Error downloading file data', error);
  //     throw error;
  //   }
  // }


  // async copyFile(sourcePath:any , destinationPath:any, copyType:any) {   
  //   let responseValue = ""; // Use the Dropbox SDK to copy the file
  //  await this.dbx.filesCopyV2({
  //     from_path: sourcePath,
  //     to_path: destinationPath,
  //   })
  //   .then(response => {
  //     console.log('File copied successfully:', response);
  //     responseValue = copyType + " successful"
  //   })
  //   .catch(error => {
  //       if (error.status === 409) {
    
  //         console.warn('Conflict: The file already exists at the destination path.');
  //         responseValue = copyType + " successful"
  //         // You can choose to log the error or take other actions if needed
  //       } 
  //       else{
  //         responseValue = copyType + " error"
  //         console.error('Error copying file:', error);
  //       }
    
  //   });
  //   return responseValue;
  // }


  exchangeAuthorizationCodeForAccessToken() {
    const dropboxAppKey = '72ecq2vxlip8j51';
    const dropboxAppSecret = 'btxsvfze6gzz7tk';
  
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  
    const params = new HttpParams()
      .set('refresh_token', 'sL19DldRa4wAAAAAAAAAAdrh2T7brBUwud0PU64qYnRwGPPxtuQSHkpvXgCIYtW8')
      .set('grant_type', 'refresh_token')
      .set('client_id', dropboxAppKey)
      .set('client_secret', dropboxAppSecret)
  
    this.http.post('https://api.dropboxapi.com/oauth2/token', params, { headers })
      .subscribe((response: any) => {
        const accessToken = response.access_token;
        console.log('Access token:', accessToken);
        sessionStorage.setItem('access_token', accessToken)
        // Store the access token securely and use it for API calls
      });
  }

  // async moveFile(fromPath: string, toPath: string) {
  //   try {
  //     await this.dbx.filesMoveV2({
  //       from_path: fromPath,
  //       to_path: toPath,
  //     });
  //     console.log(`File moved from ${fromPath} to ${toPath}`);
  //   } catch (error) {
  //     console.error('Error moving file:', error);
  //   }
  // }


  async copyFileToMultiplePaths(sourcePath:any, destinationPaths:any) {
   
    let status: any[] = []
    // Iterate through the destination paths and use the Dropbox SDK to copy the file to each path
    destinationPaths.forEach((destinationPath: any) => {
      this.dbx.filesCopyV2({
        from_path: sourcePath,
        to_path: destinationPath,
      })
      .then(response => {
        status.push("success")
        console.log('File copied successfully to', destinationPath, ':', response);
      })
      .catch(error => {
        console.error('Error copying file to', destinationPath, ':', error);
        if (error.status === 409) {
          status.push("success")
          console.warn('Conflict: The file already exists at the destination path.');
          // You can choose to log the error or take other actions if needed
        } else{
         let val =  this.copyFileWithRetry(sourcePath, destinationPath)
          status.push(val)
        }
      });
    });

    return status;
  }


  async  copyFileWithRetry(sourcePath:any, destinationPath:any) {

  
    let retries = 0; 
    let status: (string | Promise<void>)[] = []
    while (retries < 2) {
      try {
        await this.dbx.filesCopyV2({ from_path: sourcePath, to_path: destinationPath });
        console.log('File copied successfully.');
        status.push("success")
        break; // Exit the loop on success
      } catch (error:any) {
        if (error.status === 429) {
          // Rate limit exceeded, back off and retry
          const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Rate limit exceeded. Retrying in ${waitTime / 1000} seconds.`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
        } else {
          console.error('Error copying file:', error);
          break; // Exit the loop on other errors
        }
      }
    }

    return status;
  }
// working below retry code

  async uploadFile(filePath: string, fileContent: string) {
    let retries = 0;
    const maxRetries = 4
    let response;
    let retryDelay = 1000
    let lastError: any;
    while (retries < maxRetries) {
      try {
        this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
        response = await this.dbx.filesUpload({
          path: filePath,
          contents: fileContent,
          mode: { '.tag': 'add' },
        });
        console.log(`File uploaded successfully: ${filePath}`);
        return response; // Exit the function if the upload is successful
      } catch (error:any) {
        console.error(`Error uploadFile: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`uploadFile Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`uploadFile failed after ${maxRetries} retries.`);
        }
      }
    }
    return Promise.reject(lastError);
  
  }
  


  async updateFile(filePath: string, fileContent: string) {
    let retries = 0;
    const maxRetries = 4
    let response;
    let retryDelay = 1000
    let lastError: any;
    while (retries < maxRetries) {
      try {
        this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
        response = this.dbx.filesUpload({
          path: filePath,
          contents: fileContent,
          mode: { '.tag': 'overwrite' }, // Overwrite the file
        });
        console.log(`File updated successfully: ${filePath}`);
        return response; // Exit the function if the upload is successful
      } catch (error:any) {
        console.error(`Error updateFile: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`updateFile Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`updateFile failed after ${maxRetries} retries.`);
        }
      }
    }
    return Promise.reject(lastError);
  
  }
  
  async getFilesInFolder(folderPath: string) {
  

    let retries = 0;
    const maxRetries = 4;
    let response;
    let retryDelay = 2000;
    let lastError: any;

    while (retries < maxRetries) {
      try {
        this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')! });
        response = await this.dbx.filesListFolder({ path: folderPath });
        console.log(`getFilesInFolder successfully: ${folderPath}`);
        return response.result.entries; // Exit the function if the upload is successful
      } catch (error: any) {
        console.error(`Error getFilesInFolder: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`getFilesInFolder Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`getFilesInFolder failed after ${maxRetries} retries.`);
        }
      }
    }

    // If the function reaches here, it means the API call was unsuccessful, and retries are exhausted
    return Promise.reject(lastError);
  }


  async getFileData(filePath: string) {
   
    let retries = 0;
    const maxRetries = 4
    let response;
    let lastError: any;
    let retryDelay = 1000
    while (retries < maxRetries) {
      try {
        this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
        response =  await this.dbx.filesDownload({ path: filePath });
        console.log(`filesDownload successfully: ${filePath}`);
        return  response.result; // Exit the function if the upload is successful
      } catch (error:any) {
        console.error(`Error filesDownload: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`filesDownload Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`filesDownload failed after ${maxRetries} retries.`);
        }
      }
    }
    return Promise.reject(lastError);
  
  }





  async copyFile(sourcePath:any , destinationPath:any, copyType:any) {
   
    let retries = 0;
    const maxRetries = 4
    let response;
    let retryDelay = 1000
    let lastError: any;
    while (retries < maxRetries) {
      try {
        this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
        response = await this.dbx.filesCopyV2({
          from_path: sourcePath,
          to_path: destinationPath,
        })
        console.log('File copied successfully:', response);
        response = copyType + " successful"
        return  response;
        // Exit the function if the upload is successful
      } catch (error:any) {
        console.error(`Error copyFile: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`copyFile Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`copyFile failed after ${maxRetries} retries.`);
        }
      }
    }
    return Promise.reject(lastError);
  }





  async moveFile(fromPath: string, toPath: string) {
    this.dbx = new Dropbox({ accessToken: sessionStorage.getItem('access_token')!})
    let retries = 0;
    const maxRetries = 4
    let response;
    let retryDelay = 1000
    let lastError: any;
    while (retries < maxRetries) {
      try {
        response =     await this.dbx.filesMoveV2({
          from_path: fromPath,
          to_path: toPath,
        });
        console.log('File moved successfully:', response);
        return  response;
        // Exit the function if the upload is successful
      } catch (error:any) {
        console.error(`Error moveFile: ${error}`);
        lastError = error;
        retries++;
        if (retries < maxRetries) {
          console.log(`moveFile Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff, or use a fixed delay
        } else {
          // If retries are exhausted, return the error
          console.log(`moveFile failed after ${maxRetries} retries.`);
        }
      }
    }
    return Promise.reject(lastError);
  }
}