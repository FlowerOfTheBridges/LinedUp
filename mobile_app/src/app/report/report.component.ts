import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { ProblemPage } from './problem/problem.page';
import { QueuePage } from './queue/queue.page';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit {

  @Input() identifier: number = 0;
  @Input() name: string = "";
  @Input() type: string = "";
  @Input() university: string = "";
  @Input() street: string = "";
  @Input() status: number = 0;
  @Input() isNear: boolean = false;
  @Input() isFavourite: boolean = false;
  @Input() hasNews: boolean = false;
  @Input() persons: string = null;
  @Input() time: string = null;
  @Input() building: string = "";
  @Input() description: string = "";
  @Input() ts: number = null;

  private hours: string = null;

  private lastUpdate: string = null;

  private interval: any = null;

  private numberOfPersons: any = {
    "< 10": "Less than 10",
    "10 - 20": "Between 10 and 20",
    "20 - 40": "Between 20 and 40",
    "40 >": "More than 40"
  };

  private estimatedTime: any = {
    "< 5": "At most 5 minutes",
    "5 - 10": "Between 5 and 10 minutes",
    "10 - 30": "Between 10 and 30 minutes",
    "30 - 60": "Between 30 and 60 minutes",
    "60 >": "More than 60 minutes"
  };

  private viewedType: any = {
    "office hours": "Office Hours",
    "canteen": "University Canteen",
    "secretariat": "Secretariat"
  }

  constructor(private ref: ChangeDetectorRef, private router: Router, private authService: AuthService, public modalController: ModalController, public toastController: ToastController) {
    ref.detach();
    this.interval = setInterval(() => {
      this.ref.detectChanges();
    }, 500);
  }

  ngOnInit() {
    this.authService.getFavourites().then(favourites => {
      favourites != null && favourites.forEach((favourite: number) => {
        if (favourite == this.identifier) {
          this.isFavourite = true;
        }
      })
      clearInterval(this.interval);
      this.ref.reattach();
    });

    this.authService.getPlaceInformation(this.university, this.identifier).subscribe(placeInfo => {
      if (this.persons) {
        this.persons = this.numberOfPersons[placeInfo.place.people];
      }

      if (this.time) {
        this.time = this.estimatedTime[placeInfo.place.time];
      }

      if (this.ts) {
        this.lastUpdate = new Date(placeInfo.place.ts).toLocaleString();
      }

      this.hours = placeInfo.place.hour;

    })

  }

  async problemModal() {
    const modal = await this.modalController.create({
      component: ProblemPage,
      componentProps: {
        "identifier": this.identifier,
        "name": this.name,
        "university": this.university
      }
    });
    return await modal.present();
  }

  async queueModal() {
    const modal = await this.modalController.create({
      component: QueuePage,
      componentProps: {
        "id": this.identifier,
        "university": this.university,
        "name": this.name,
        "street": this.street,
        "hours": this.hours
      }
    });

    modal.onDidDismiss()
      .then((evt) => {
        let requestResult = evt.data['requestResult'];
        console.log("request result is %o", requestResult);
        if (requestResult != null) {
          this.persons = this.numberOfPersons[requestResult.persons];
          this.time = this.estimatedTime[requestResult.time];
          this.ts = requestResult.ts;
          this.lastUpdate = new Date(requestResult.ts).toLocaleString();
        }
      });
    return await modal.present();
  }

  addToFavourites() {
    this.isFavourite = !this.isFavourite;
    this.authService.addToFavourites(this.identifier);
    this.presentToast();
  }

  goToNews() {
    this.router.navigateByUrl("/news");
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: this.name + (this.isFavourite ? " has been added to your favourites." : " has been removed from your favourites."),
      duration: 2000,
    });
    toast.present();
  }

}
