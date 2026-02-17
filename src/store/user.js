
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user',{
  state:()=> ({
    user: JSON.parse(localStorage.getItem('user')) || {
      firstName:'Khodor',
      lastName:'Kashmar',
      role:'admin'
    }
  }),
  actions:{
    logout(){
      localStorage.clear()
      location.reload()
    }
  }
})
