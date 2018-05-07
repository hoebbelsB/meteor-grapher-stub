import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const invoiceCollection = new Mongo.Collection('invoice', {idGeneration: 'STRING'});
export const invoiceLineItemCollection = new Mongo.Collection('invoice_line_item', {idGeneration: 'STRING'});
export const fileCollection = new Mongo.Collection('file', {idGeneration: 'STRING'});
export const invoiceElementCollection = new Mongo.Collection('invoice_element', {idGeneration: 'STRING'});
export const invoiceTemplateCollection = new Mongo.Collection('invoice_template', {idGeneration: 'STRING'});
export const customerCollection = new Mongo.Collection('customer', {idGeneration: 'STRING'});
customerCollection.addReducers({
    fullBillingAdr: {
        body: {
            billingAdrStreet: 1,
            billingAdrCity: 1,
            billingAdrState: 1,
            billingAdrZip: 1,
            billingAdrCountry: 1
        },
        reduce(customer) {
            let addressString = !!customer.billingAdrStreet ? customer.billingAdrStreet : '';
            addressString += !!customer.billingAdrZip ? ' ' + customer.billingAdrZip : '';
            addressString += !!customer.billingAdrCity ? ' ' + customer.billingAdrCity : '';
            addressString += !!customer.billingAdrState ? ' ' + customer.billingAdrState : '';
            addressString += !!customer.billingAdrCountry ? ' ' + customer.billingAdrCountry : '';
            return addressString;
        }
    },
    fullName: {
        body: {
            name: 1,
            name2: 1,
        },
        reduce(customer) {
            return !!customer.name2 ? customer.name + ' - ' + customer.name2 : customer.name;
        }
    }
});

invoiceCollection.addLinks({
    customer: {
        type: 'one',
        collection: customerCollection,
        field: 'customerId',
        denormalize: {
            field: 'customerCache',
            body: {
                name: 1,
                name2: 1
            }
        }
    },
    template: {
        type: 'one',
        collection: invoiceTemplateCollection,
        field: 'templateId'
    },
    invoiceElements: {
        collection: invoiceElementCollection,
        inversedBy: 'invoice'
    },
    invoiceLineItems: {
        collection: invoiceLineItemCollection,
        inversedBy: 'invoice'
    }
});

invoiceCollection.addReducers({
    margins: {
        body: {
            marginLeft: 1,
            marginRight: 1,
            marginTop: 1,
            marginBottom: 1
        },
        reduce(invoice) {
            return {
                left: invoice.marginLeft ? invoice.marginLeft : 0,
                right: invoice.marginRight ? invoice.marginRight : 0,
                top: invoice.marginTop ? invoice.marginTop : 0,
                bottom: invoice.marginBottom ? invoice.marginBottom : 0
            }
        }
    },
});

invoiceLineItemCollection.addLinks({
    invoice: {
        type: 'one',
        collection: invoiceCollection,
        field: 'invoiceId'
    }
});

invoiceElementCollection.addLinks({
    invoice: {
        type: 'one',
        collection: invoiceCollection,
        field: 'invoiceId'
    },
    template: {
        type: 'one',
        collection: invoiceCollection,
        field: 'templateId'
    },
    file: {
        type: 'one',
        collection: fileCollection,
        field: 'fileId'
    }
});

Meteor.methods({
    'invoice.deleteLineItem'(_id) {
        const lineItem = invoiceLineItemCollection.findOne({_id: _id[0]});
        if (!lineItem) {
            throw new Meteor.Error(404, 'Could not find lineItem with id ' + _id[0] + '!');
        }
        const invoice = invoiceCollection.findOne({_id: lineItem.invoiceId});
        if (!invoice) {
            throw new Meteor.Error(404, 'Could not find invoice with id ' + lineItem.invoiceId + '!');
        }

        const invoiceUpdateResult = invoiceCollection.update(
            {_id: lineItem.invoiceId},
            {
                $set: {
                    'grosssum': invoice.grosssum - lineItem.grosspriceTotal
                }
            }
        );
        if (invoiceUpdateResult !== 1) {
            throw new Meteor.Error(500, 'Could not update invoice sum!');
        }

        let invoiceLineItemUpdate = 0;
        invoiceLineItemUpdate = invoiceLineItemCollection.update(
            {_id: _id[0]},
            {$set: {_deleted: true}}
        );
        if (invoiceLineItemUpdate === 1) {
            invoiceLineItemCollection.update(
                {
                    invoiceId: lineItem.invoiceId,
                    number: {$gt: lineItem.number}
                },
                {$inc: {number: -1}},
                {multi: true}
            );
        } else {
            throw new Meteor.Error(500, 'Could not remove invoice lineitem!');
        }
        return invoiceLineItemUpdate;
    }
});

if (Meteor.isServer) {

    invoiceCollection.expose({
        firewall(filters, options, userId) {}
    });

    invoiceLineItemCollection.expose({
        firewall(filters, options, userId) {}
    });
}
