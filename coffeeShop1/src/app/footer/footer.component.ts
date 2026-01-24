import { Component } from '@angular/core';
import {VERSION} from '../common/constanst';
@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  version:any=VERSION

}
