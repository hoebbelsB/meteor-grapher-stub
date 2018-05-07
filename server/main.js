import { Meteor } from 'meteor/meteor';
import '../imports/api/invoice';
import {invoiceCollection, invoiceLineItemCollection} from "../imports/api/invoice";

Meteor.startup(() => {
    invoiceCollection.remove({});
    invoiceLineItemCollection.remove({});

    const invoiceId = invoiceCollection.insert({
        name: 'Test invoice 1',
        grosssum: 20000
    });
    for (let i = 1; i < 21; i++) {
        invoiceLineItemCollection.insert({
            invoiceId: invoiceId,
            name: 'lineItem ' + i,
            grosspriceTotal: 200,
            number: i,
            _deleted: false
        });
    }
});

invoiceLineItemCollection.before.find((userId, selector, options, cursor) => {
    selector['_deleted'] = {$eq : false };
});