import { Component, OnInit, ComponentFactoryResolver, Injector } from '@angular/core';
import { GeoController } from '../../component/controller/GeoController';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { MapController } from '../../component/controller/MapController';
import { LoadingController, ModalController } from '@ionic/angular';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Position } from 'src/component/entity/Position';
import { MapTutorial } from '../tutorials/map/map.page';
import { GeolocationPage } from '../error/geolocation/geolocation.page';

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  private geoController: GeoController
  private mapController: MapController

  private openQueues = false;

  private queueSearch: string = null;
  private searchList: Array<any> = [];
  private viewResult: boolean = false;

  private filters: any = {
    type: [
      { name: "Secretariat", value: "secretariat" },
      { name: "Office hours", value: "office hours" },
      { name: "Canteen", value: "canteen" }
    ],
    status: [
      { name: "Opened", value: 1 },
      { name: "Closed", value: 0 }
    ]
  }

  private filter: any = {
    type: null,
    status: null
  }

  private filterSection: boolean = false;

  private university: string = null;

  constructor(public loadingController: LoadingController, public modalController: ModalController, private geolocation: Geolocation, private authService: AuthService, private httpClient: HttpClient, private router: Router) {

    this.geoController = new GeoController(this.geolocation);
  }

  ionViewWillEnter() {
    this.presentLoading();
  }

  ionViewDidEnter() {

    this.authService.getUniversity().then(university => {
      this.university = university;
      this.authService.getPlace().subscribe(place => {
        console.log("place is %o", place);
        if (place != null) {
          this.initMap(null, place.id);
        }
        else {

          this.initMap(null, null);
        }

      })
    })
  }

  ngOnInit() {
  }

  async presentLoading() {
    const loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
      duration: 2000
    });
    await loading.present();

    loading.onDidDismiss().then(() => {
      this.authService.getTutorials().then(tutorials => {
        if (tutorials) {
          tutorials[0] && this.showTutorial(true);
        }
        else {
          this.showTutorial(true);
        }
      })
    });
    console.log('Loading dismissed!');
  }

  async showTutorial(isTutorial: boolean) {
    console.log("showing tutorial");
    const modal = await this.modalController.create({
      component: MapTutorial,
      componentProps: {
        "isTutorial": isTutorial
      }
    });
    modal.onDidDismiss().then(evt => {
      let hideTutorial = evt.data['hideTutorial'];
      hideTutorial && this.authService.hideTutorial(0);
    })
    return await modal.present();
  }

  async showHerror(errorCode: number) {
    console.log("showing error");
    const modal = await this.modalController.create({
      component: GeolocationPage,
      componentProps: {
        "code": errorCode
      }
    });
    modal.onDidDismiss().then(evt => {
      this.router.navigateByUrl('/home-auth');
    })
    return await modal.present();
  }


  ionViewWillLeave() {
    if (this.mapController) {
      this.mapController.destroyMap();
      console.log("map destroyed");
    }
    
    this.openQueues = false;
  }

  search(queue: string) {
    if(this.openQueues){
      this.openQueues = false;
    }
    if (queue != "") {
      if ((this.queueSearch == null || this.viewResult) && this.mapController) {
        // destroy map if it was defined
        this.mapController.destroyMap();

        if (this.viewResult) {
          this.viewResult = false;
        }
      }


      this.authService.searchQueue(queue, this.filter).subscribe(res => {
        if (Array.isArray(res)) {
          this.searchList = res;
        }
      });
      this.queueSearch = queue;
    }
    else {
      this.queueSearch = null;
      if (!this.viewResult) {
        this.initMap(null, null);
      }
    }
    console.log("queue is %s", this.queueSearch);
  }

  selectQueue(queue: any) {
    console.log("queue is %o", queue);
    this.viewResult = true;
    this.initMap(new Position(queue.position.lat, queue.position.lon, 100), queue.id);//JSON.stringify(queue.position));
  }

  initMap(queuePosition: any, showPopup: any) {

    let marker = null;

    this.geoController.getUserPosition().then(pos => {
      console.debug("my pos is : " + pos);
      if (Number.isInteger(pos)) {
        this.showHerror(pos);
      }
      else {
        this.mapController = new MapController('map', pos, queuePosition || pos, this.httpClient, showPopup);
        marker = this.mapController.addUser();
        this.mapController.getPositions(this.university);
      }
    })
  }

  selectType(type: string) {
    this.filter.type = type;
    console.log("filter is %o", this.filter);
    this.search(this.queueSearch);
  }

  selectStatus(status: number) {
    this.filter.status = status;
    console.log("filter is %o", this.filter);
    this.search(this.queueSearch);
  }

  changeFilterSection() {
    this.filterSection = !this.filterSection;
  }

  clearFilter() {
    this.filter.type = null;
    this.filter.status = null;

    this.search(this.queueSearch);
  }

  changeMarkers() {
    this.mapController.changeQueues(this.openQueues);
  }

  resetView(){
    this.mapController.resetView();
  }

}
