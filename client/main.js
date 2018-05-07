import {Template} from 'meteor/templating';
import {ReactiveVar} from 'meteor/reactive-var';
import {invoiceCollection} from '../imports/api/invoice';

import './main.html';

Template.invoice.onCreated(function invoiceOnCreated() {
    this.invoice = new ReactiveVar(null);
    const query = invoiceCollection.createQuery({
        $filters: {},
        name: 1,
        grosssum: 1,
        invoiceLineItems: {
            name: 1,
            number: 1,
            grosspriceTotal: 1
        }
    });
    const sub = query.subscribe();
    const tmpl = Template.instance();
    this.autorun(() => {
        if (sub.ready()) {
            const data = query.fetchOne();
            tmpl.invoice.set(data);
            console.log('all data');
            console.log(data);

            const items = data.invoiceLineItems.map((l) => {
                return l.number;
            });
            console.log('just numbers');
            console.log(items);
        }
    });
});

Template.invoice.helpers({
    invoice() {
        return Template.instance().invoice.get();
    },
});

Template.lineItem.events({
   'click a'(event) {
       event.preventDefault();
       const id = event.target.getAttribute('data-id');
       Meteor.call('invoice.deleteLineItem', [id], (err, res) => {
           if (!!err) {
               console.log('error');
               console.log(err);
           }
       });
   }
});
