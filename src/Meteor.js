import reactMixin from 'react-mixin';
import Trackr from 'trackr';
import DDP from 'ddp.js';

import Data from './Data';
import Mixin from './Mixin';
import User from './User';

module.exports = {
  connectMeteor(reactClass) {
    return reactMixin.onClass(reactClass, Mixin);
  },
  collection(name) {
    return {
      find(selector, options) {
        if(!Data.db || !Data.db[name]) return [];
        return Data.db[name].find(selector, options)

      },
      findOne(selector, options) {
        if(!Data.db || !Data.db[name]) return null;
        if(typeof selector == 'string') return this.findOne({_id: selector}, options);
        return Data.db[name] && Data.db[name].findOne(selector, options)

      }
    };
  },
  ...User,
  status() {
    return {
      connected: Data.ddp ? Data.ddp.status=="connected" : false,
      status: Data.ddp ? Data.ddp.status : "disconnected"
      //retryCount: 0
      //retryTime:
      //reason:
    }
  },
  call(eventName) {
    var args = Array.prototype.slice.call(arguments, 1);
    if (args.length && typeof args[args.length - 1] === "function") {
      var callback = args.pop();
    }


    const id = Data.ddp.method(eventName, args);
    Data.calls.push({
      id: id,
      callback: callback
    });
  },
  connect(endpoint) {
    Data.ddp = new DDP({
      endpoint: endpoint,
      SocketConstructor: WebSocket
    });

    Data.ddp.on("connected", ()=>{
      console.info("connected");
      this._loadInitialUser();
    });

    Data.ddp.on("added", message => {
      if(!Data.db[message.collection]) {
        Data.db.addCollection(message.collection)
      }
      Data.db[message.collection].upsert({_id: message.id, ...message.fields});
    });

    Data.ddp.on("ready", message => {
      console.info('READY', message.subs);
      //console.log('READY', Data.db.todos && Data.db.todos.find().length);
    });

    Data.ddp.on("changed", message => {
      Data.db[message.collection].upsert({_id: message.id, ...message.fields});
    });

    Data.ddp.on("removed", message => {
      Data.db[message.collection].del(message.id);
    });

    Data.ddp.on("result", message => {
      const call = Data.calls.find(call=>call.id==message.id);
      if(typeof call.callback == 'function') call.callback(message.error, message.result);
      Data.calls.splice(Data.calls.findIndex(call=>call.id==message.id), 1);
    });

    Data.ddp.on("nosub", message => {
      for(var i in Data.subscriptions) {
        const sub = Data.subscriptions[i];
        if(sub.id == message.id) {
          console.log("No sub for", sub.name);
        }
      }
    });
  },
  subscribe(name) {
    const params = Array.prototype.slice.call(arguments, 1);

    const stringKey = name+JSON.stringify(params);

    if (!Data.subscriptions[stringKey]) {
      // We're not currently subscribed to this. Go start a subscription.
      //console.log("Subscribe to", name, "with params", params);
      Data.subscriptions[stringKey] = {
        references: 1,
        name: name,
        params: params,
        id: Data.ddp.sub(name, params),
        stop: function () {
          // Wait for all autoruns to finish rerunning before processing the unsubscription
          // request. It's possible that stop() was called because an autorun is rerunning,
          // so before doing anything drastic, we should wait to see if the autorun
          // recreates the subscription when it is rerun.
          this.references--;
          Trackr.afterFlush(() => {
            if (this.references === 0) {
              // Nope, either the autorun did not recreate the subscription, or there
              // were multiple calls to subscribeToMagazine() in the first place and not all
              // of them have been stopped. Go ahead and cancel.
              //console.log("Canceling our subscription to", name, "with params", params);
              Data.ddp.unsub(Data.subscriptions[stringKey].id);
              delete Data.subscriptions[stringKey];
            }
          });
        }
      };
    } else {
      // We already have a subscription to this magazine running. Increment the reference
      // count to stop it from going away.
      Data.subscriptions[stringKey].references++;
    }

    if (Trackr.active) {
      Trackr.onInvalidate((c) => {
        // subscribeToMagazine was called from inside an autorun, and the autorun is
        // about to rerun itself. Tentatively plan to cancel the subscription. If the
        // autorun resubscribes to that same magazine when it is rerun, the logic in
        // in stop() is smart enough to leave the subscription alone rather than
        // canceling and immediately recreating it.
        //
        // (Tracker.onInvalidate is a shortcut for Tracker.currentComputation.onInvalidate.)
        if (Data.subscriptions[stringKey]) {
          Data.subscriptions[stringKey].stop();
        }
      });
    }

    return Data.subscriptions[stringKey];
  }
}
