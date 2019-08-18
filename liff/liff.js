// User service UUID: Change this to your generated service UUID
const USER_SERVICE_UUID = '36a08824-8aaa-418a-b157-928d895361cd'

const WRITE_CHARACTERISTIC_UUID = 'E9062E71-9E62-4BC6-B0D3-35CDCD9B027B'
const NOTIFY_CHARACTERISTIC_UUID = '62FBD229-6EDD-4D1A-B554-5C4E1BB29169'

const PSDI_SERVICE_UUID = 'E625601E-9E55-4597-A598-76018A0D293D'
const PSDI_CHARACTERISTIC_UUID = '26E2B12B-85F0-4F3F-9FDD-91D114270E6E'

// const uiUVIndex = document.getElementById('uvIndex')
// const uiUVValue = document.getElementById('uvValue')
// const uiError = document.getElementById('err')
const de = document.getElementById('debug')
const uiToggle = document.getElementById('toggle')
const uvLevelMap = ['弱い', '中程度', '強い', 'とても強い', '危険']

let callCounter = 0

class LifeGage {
  constructor() {
    this.container = document.getElementById('tab2')
    this.bar = document.getElementById('js-life-bar')
    this.state = 'default'
    this.value = 0
  }

  increase() {
    if (this.value === 0) return
    if (this.value >= 0) {
      this.value = 0
    } else {
      ++this.value
    }
    this.moveBar()
  }

  decrease() {
    if (this.value <= -100) return
    --this.value
    this.moveBar()
  }

  moveBar() {
    de.textContent = ++callCounter
    this.bar.style.transform = `translateX(${this.value}%)`
    this.switchStateIfNeed()
  }

  switchStateIfNeed() {
    let state
    if (this.value >= -50) {
      state = 'default'
    }
    if (this.value < -50) {
      state = 'danger'
    }
    if (this.state !== state) {
      const cls = state === 'default' ? 'is-def' : 'is-danger'
      const removeCls = this.state === 'default' ? 'is-def' : 'is-danger'
      this.container.classList.remove(removeCls)
      this.container.classList.add(cls)
    }
    this.state = state
  }
}

class UvLevel {
  constructor() {
    this.panel = document.getElementById('tab1')
    this.levelText = document.getElementById('js-ttl-level')
  }

  switchState(index) {
    const cls = `is-level-${index}`
    const levelText = uvLevelMap[--index]

    if (this.current) {
      this.panel.classList.remove(`is-level-${this.current}`)
    }
    this.panel.classList.add(cls)
    this.levelText.textContent = levelText
  }
}

class Tab {
  constructor(tabList) {
    this.triggers = [...tabList.querySelectorAll('.js-tab-btn')]
    this.init()
  }

  init() {
    this.triggers.forEach(trigger => {
      const target = document.getElementById(trigger.dataset.tab)
      const isActive = trigger.classList.contains('is-active')
      trigger.dataset.tab = target

      if (isActive) {
        this.current = { trigger, target }
      }
      trigger.addEventListener('click', e => {
        if (trigger === this.current.trigger) return
        this.toggle(trigger, target)
      })
    })
  }

  toggle(trigger, target) {
    trigger.classList.add('is-active')
    target.classList.add('is-show')
    this.deactiveCurrent()
    this.current = { trigger, target }
  }

  deactiveCurrent() {
    this.current.trigger.classList.remove('is-active')
    this.current.target.classList.remove('is-show')
  }
}

// -------------- //
// On window load //
// -------------- //

window.onload = () => {
  initializeApp()
}

// -------------- //
// UI functions //
// -------------- //

uiToggle.addEventListener('click', uiToggleHandler)

new Tab(document.getElementById('js-tab-list'))
const lifeGage = new LifeGage()
const uvLevel = new UvLevel()

function makeErrorMsg(errorObj) {
  if (typeof errorObj === 'string' || typeof errorObj === 'number')
    return errorObj
  return errorObj.toString()
}

function uiStatusError(message) {
  uiError.innerText = message
}

function uiToggleDeviceConnected(connected) {
  if (!connected) {
    uiToggleUVScanToggle(false)
  }
  // if (connected) {
  //   uiStatus.innerText = 'Connected!';
  // } else {
  //   uiStatus.innerText = 'Disconnected!';
  // }
}

function uiUpdateValues(uvValues) {
  // uiUVValue.innerText = `UV VALUE: ${uvValues[0]}`
  // uiUVIndex.innerText = `UV INDEX: ${uvValues[1]}`
  const uvValue = Number(uvValues[0])
  if (uvValue > 0) {
    lifeGage.decrease()
  } else {
    lifeGage.increase()
  }
  uvLevel.switchState(Number(uvValues[1]))
}

function uiToggleUVScanToggle(state) {
  const label = state ? 'Stop' : 'Start'
  uiToggle.textContent = label
}

function uiToggleHandler(e) {
  const isStart = e.target.textContent === 'Start' ? true : false
  uiToggleUVScanToggle(isStart)
  liffToggleState(isStart)
}

// -------------- //
// LIFF functions //
// -------------- //

function initializeApp() {
  liff.init(() => initializeLiff(), error => uiStatusError(makeErrorMsg(error)))
}

function initializeLiff() {
  liff
    .initPlugins(['bluetooth'])
    .then(() => {
      liffCheckAvailablityAndDo(() => liffRequestDevice())
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })
}

function liffCheckAvailablityAndDo(callbackIfAvailable) {
  // Check Bluetooth availability
  liff.bluetooth
    .getAvailability()
    .then(isAvailable => {
      if (isAvailable) {
        uiToggleDeviceConnected(false)
        callbackIfAvailable()
      } else {
        uiStatusError('Bluetooth not available')
        setTimeout(() => liffCheckAvailablityAndDo(callbackIfAvailable), 10000)
      }
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })
}

function liffRequestDevice() {
  liff.bluetooth
    .requestDevice()
    .then(device => {
      liffConnectToDevice(device)
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })
}

function liffConnectToDevice(device) {
  device.gatt
    .connect()
    .then(() => {
      // Show status connected
      uiToggleDeviceConnected(true)

      // Get service
      device.gatt
        .getPrimaryService(USER_SERVICE_UUID)
        .then(service => {
          liffGetUserService(service)
        })
        .catch(error => {
          uiStatusError(makeErrorMsg(error), false)
        })
      device.gatt.getPrimaryService(PSDI_SERVICE_UUID).catch(error => {
        uiStatusError(makeErrorMsg(error), false)
      })

      // Device disconnect callback
      const disconnectCallback = () => {
        // Show status disconnected
        uiToggleDeviceConnected(false)

        // Remove disconnect callback
        device.removeEventListener('gattserverdisconnected', disconnectCallback)

        // Try to reconnect
        initializeLiff()
      }

      device.addEventListener('gattserverdisconnected', disconnectCallback)
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })
}

function liffGetUserService(service) {
  // Button pressed state
  service
    .getCharacteristic(NOTIFY_CHARACTERISTIC_UUID)
    .then(characteristic => {
      liffGetReadCharacteristic(characteristic)
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })

  // Toggle LED
  service
    .getCharacteristic(WRITE_CHARACTERISTIC_UUID)
    .then(characteristic => {
      window.writeCharacteristic = characteristic
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error))
    })
}

function liffGetReadCharacteristic(characteristic) {
  // Add notification hook for button state
  // (Get notified when button state changes)
  characteristic
    .startNotifications()
    .then(() => {
      characteristic.addEventListener(
        'characteristicvaluechanged',
        liffCharacteristicValueChanged
      )
    })
    .catch(error => {
      uiStatusError(makeErrorMsg(error), false)
    })
}

function liffCharacteristicValueChanged(e) {
  const buff = new Uint8Array(e.target.value.buffer)
  try {
    const val = new TextDecoder().decode(buff).split(',')
    uiUpdateValues(val)
  } catch (e) {
    uiStatusError(e)
  }
}

function liffToggleState(state) {
  // on: 0x01
  // off: 0x00
  window.writeCharacteristic
    .writeValue(state ? new Uint8Array([0x01]) : new Uint8Array([0x00]))
    .catch(error => {
      uiStatusError(makeErrorMsg(error), false)
    })
}
