define([
        "dojo/_base/declare",
        "dojo/text!./template/CheckoutWidgetTemplate.html",
        "dojo/_base/lang",
        "dojo/topic",
        "dijit/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dojo/_base/window",
        "dojo/dom-attr",
        "dojo/dom-construct",
        "dojo/Deferred",
        "dijit/form/TextBox",
        "./model/ModelSupport",
        "../BaseResultCreation" ,
        "./base/Reporting/ReportingWidget",
        "./base/Webmap/PortalPublisherWidget",
        "./base/Download/ImageryDownloadWidget"
    ],
    function (declare, template, lang, topic, _WidgetBase, _TemplatedMixin, window, domAttr, domConstruct, Deferred, TextBox, ModelSupport, BaseResultCreation, ReportingWidget, PortalPublisherWidget, ImageryDownloadWidget) {
        return declare([_WidgetBase, _TemplatedMixin, BaseResultCreation, ModelSupport], {

            blockThumbHover: true,
            webmapConfiguration: null,
            map: null,
            downloadEnabled: true,
            reportingConfiguration: {},
            templateString: template,
            confirmationLabel: "Confirmation",
            constructor: function (params) {
                lang.mixin(this, params || {});
                this.confirmationLabel = this.nls.confirmation;

            },
            postCreate: function () {
                this.inherited(arguments);
                this._underlay = domConstruct.create("div", {className: "cartCheckoutStatusModalUnderlay hidden"});
                domConstruct.place(this._underlay, window.body());
                this._createProgressBar();
                this._createReportingWidget();
                this._createWebmapWidget();
                this._createDownloadWidget();
                this.on("downloadImageRequest", lang.hitch(this, this.handleDownloadImageryRequest));
            },
            _createDownloadWidget: function () {
                this.downloadWidget = new ImageryDownloadWidget({
                    nls: this.nls
                });
                this.downloadWidget.placeAt(this.downloadWidgetContainer);
            },
            _createWebmapWidget: function () {

                var params = {
                    nls: this.nls,
                    map: this.map,
                    webmapConfiguration: this.webmapConfiguration

                };
                if (this.portalUrl) {
                    params.portalUrl = this.portalUrl;
                }
                this.webmapWidget = new PortalPublisherWidget(params);
                this.webmapWidget.placeAt(this.webmapWidgetContainer);
            },
            _createReportingWidget: function () {
                this.reportingWidget = new ReportingWidget({
                    nls: this.nls,
                    map: this.map,
                    reportingConfiguration: this.reportingConfiguration
                });
                this.reportingWidget.placeAt(this.reportingWidgetContainer);
            },
            clear: function () {
                this.inherited(arguments);
                domConstruct.empty(this.cartItemsCheckoutMessageContainer);
                this.closeCurrentResultPopup();
            },
            getOrderName: function () {
            },
            /**
             * displays the checkout status widget
             */
            show: function () {
                domAttr.set(this.checkoutWidgetHeaderText, "innerHTML", this.nls.goToCart);
                this._showNode(this._underlay);
                this._showNode(this.domNode);
                this.hideMessageContainer();
            },
            /**
             * hides the checkout status widget
             */
            hide: function () {
                this._hideNode(this._underlay);
                this._hideNode(this.domNode);
                domConstruct.empty(this.cartItemsCheckoutMessageContainer);
                this.closeCurrentResultPopup();
                this.clearTooltipCache();
                this.clear();
            },
            /**
             * starts the checkout view
             */
            handleStartCheckout: function (archiveEntries) {
                this.currentCheckoutDeferred = new Deferred();
                this.show();
                this._hideNode(this.checkoutStatusCloseButton);
                domConstruct.empty(this.orderItemsContainer);
                this.totalItemsInCartCount = this._buildOrderView(archiveEntries);
                this.setTotalItems(this.totalItemsInCartCount);
                return this.currentCheckoutDeferred;
            },
            _buildOrderView: function (archiveItems) {
                return this._createArchiveItems(archiveItems);
            },
            _createArchiveItems: function (archiveItems) {
                if (!archiveItems || !archiveItems.length) {
                    return 0;
                }
                var feature, archiveItem, i, currentFeatureService, hasDownloadItem = false;
                for (i = 0; i < archiveItems.length; i++) {
                    feature = archiveItems[i];
                    currentFeatureService = feature[this.COMMON_FIELDS.SERVICE_FIELD];
                    if (currentFeatureService.downloadEnabled) {
                        hasDownloadItem = true;
                    }
                    archiveItem = this._createArchiveItem(feature);
                    domConstruct.place(archiveItem, this.orderItemsContainer);
                }
                hasDownloadItem ? this.enableDownload() : this.disableDownload();
                return archiveItems.length;
            },
            removeItemFromCart: function (feature, element) {
                this.inherited(arguments);
                this.totalItemsInCartCount--;
                //todo update this for download and order items
                this.setTotalItems(this.totalItemsInCartCount);
                this.downloadWidget.clearDownloadList();
                if (!this.totalItemsInCartCount) {
                    this.hide();
                }
                topic.publish("discovery:getDownloadableCartItems", lang.hitch(this, function (items) {
                    if (!items || !items.length) {
                        this.disableDownload();
                    }
                }));
                this.webmapWidget.showInputsContent();
            },
            setTotalItems: function (orderItemCount) {
                domAttr.set(this.totalOrderItemsElement, "innerHTML", orderItemCount + "");
                if (!orderItemCount) {
                    this.hide();
                }
            },
            //hide tabs
            submitCheckout: function (def) {
                this.showMessageContainer();
                this.hideRemoveFromCartIcons();
                if (this.currentCheckoutDeferred) {
                    this._showNode(this.progressBarOuterContainer);
                    this.currentCheckoutDeferred.resolve();
                    this.currentCheckoutDeferred = null;
                }
            },
            cancelCheckout: function (def) {
                if (this.currentCheckoutDeferred) {
                    this.currentCheckoutDeferred.reject();
                    this.currentCheckoutDeferred = null;
                }
                this.hide();
            },
            /**
             * displays the checkout complete view
             */
            setCheckoutComplete: function () {
                this._hideNode(this.progressBarOuterContainer);
                this.showCheckoutCompleteButton();
                domAttr.set(this.checkoutWidgetHeaderText, "innerHTML", this.confirmationLabel);
            },
            handleDownloadImageryRequest: function (feature) {
                if (!feature) {
                    return;
                }
                this.showDownloadTab();
                this.downloadWidget.populateDownloadLinks([feature]);
            }
        });
    });
