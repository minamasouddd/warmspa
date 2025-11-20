import { Component } from '@angular/core';
import { NavbarComponent } from './Components/navbar/navbar';
import { FooterComponent } from './Components/footer/footer.component';
import { HomepageComponent } from './Pages/homepage/homepage';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,NavbarComponent,FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  title = 'WarmSpa';
}