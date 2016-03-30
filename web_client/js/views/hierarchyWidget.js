/**
 * This widget is used to navigate the data hierarchy of folders and items.
 */
histomicstk.views.HierarchyWidget = girder.View.extend({
    events: {
        'click .g-hierarchy-level-up': 'upOneLevel'
    },

    initialize: function (settings) {

        this.parentModel = settings.parentModel;
        this.breadcrumbs = [this.parentModel];
        this._checkboxes = false;
		this._showItems = _.has(settings, 'showItems') ? settings.showItems : true;
        this._onItemClick = settings.onItemClick || function () {};

        // Initialize the breadcrumb bar state
        this.breadcrumbView = new girder.views.HierarchyBreadcrumbView({
            objects: this.breadcrumbs,
            parentView: this
        });
        this.breadcrumbView.on('g:breadcrumbClicked', function (idx) {
            this.breadcrumbs = this.breadcrumbs.slice(0, idx + 1);
            this.setCurrentModel(this.breadcrumbs[idx]);
            this._setRoute();
        }, this);

        this.folderListView = new girder.views.FolderListWidget({
            parentType: this.parentModel.resourceName,
            parentId: this.parentModel.get('_id'),
            checkboxes: this._checkboxes,
            parentView: this
        });
        this.folderListView.on('g:folderClicked', function (folder) {
            this.descend(folder);
        }, this).off('g:changed').on('g:changed', function () {
                    this.folderCount = this.folderListView.collection.length;
                    this._childCountCheck();
                }, this);

        if (this.parentModel.resourceName === 'folder') {
            this._initFolderViewSubwidgets();
        } else {
            this.itemCount = 0;
        }

        if (this.parentModel.resourceName === 'folder') {
            this._fetchToRoot(this.parentModel);
        } else {
            this.render();
        }
        girder.events.on('g:login', girder.resetPickedResources, this);
    },

    /**
     * If both the child folders and child items have been fetched, and
     * there are neither of either type in this parent container, we should
     * show the "empty container" message.
     */
    _childCountCheck: function () {
        var container = this.$('.g-empty-parent-message').addClass('hide');
        if (this.folderCount === 0 && this.itemCount === 0) {
            container.removeClass('hide');
        }
    },

    /**
     * Initializes the subwidgets that are only shown when the parent resource
     * is a folder type.
     */
    _initFolderViewSubwidgets: function () {
        this.itemListView = new girder.views.ItemListWidget({
            folderId: this.parentModel.get('_id'),
            checkboxes: this._checkboxes,
            parentView: this
        });
        this.itemListView.on('g:itemClicked', this._onItemClick, this)
            .off('g:changed').on('g:changed', function () {
                this.itemCount = this.itemListView.collection.length;
                this._childCountCheck();
            }, this);

        this.metadataWidget = new girder.views.MetadataWidget({
            item: this.parentModel,
            parentView: this,
            accessLevel: this.parentModel.getAccessLevel()
        });
    },

    _setRoute: function () {
        if (this._routing) {
            var route = this.breadcrumbs[0].resourceName + '/' +
                this.breadcrumbs[0].get('_id');
            if (this.parentModel.resourceName === 'folder') {
                route += '/folder/' + this.parentModel.get('_id');
            }
            girder.router.navigate(route);
            girder.events.trigger('g:hierarchy.route', {route: route});
        }
    },

    _fetchToRoot: function (folder) {
        var parentId = folder.get('parentId');
        var parentType = folder.get('parentCollection');
        var parent = new girder.models[girder.getModelClassByName(parentType)]();
        parent.set({
            _id: parentId
        }).once('g:fetched', function () {
            this.breadcrumbs.push(parent);

            if (parentType === 'folder') {
                this._fetchToRoot(parent);
            } else {
                this.breadcrumbs.reverse();
                this.render();
            }
        }, this).fetch();
    },

    render: function () {
        this.folderCount = null;
        this.itemCount = null;

        this.$el.html(girder.templates.hierarchyWidget({
            type: this.parentModel.resourceName,
            model: this.parentModel,
            level: this.parentModel.getAccessLevel(),
            AccessType: girder.AccessType,
            checkboxes: this._checkboxes
        }));

        this.breadcrumbView.setElement(this.$('.g-hierarchy-breadcrumb-bar>ol')).render();
        this.folderListView.setElement(this.$('.g-folder-list-container')).render();

        if (this.parentModel.resourceName === 'folder' && this._showItems) {
            this.itemListView.setElement(this.$('.g-item-list-container')).render();
        }

        this.$('[title]').tooltip({
            container: this.$el,
            animation: false,
            delay: {
                show: 100
            },
            placement: function () {
                return this.$element.attr('placement') || 'top';
            }
        });

        this.fetchAndShowChildCount();

        return this;
    },

    /**
     * Descend into the given folder.
     */
    descend: function (folder) {
        this.breadcrumbs.push(folder);
        this.setCurrentModel(folder);
    },

    /**
     * Go to the parent of the current folder
     */
    upOneLevel: function () {
        this.breadcrumbs.pop();
        this.setCurrentModel(this.breadcrumbs[this.breadcrumbs.length - 1]);
    },


    fetchAndShowChildCount: function () {
        this.$('.g-child-count-container').addClass('hide');

        if (this.parentModel.resourceName === 'folder') {
            var showCounts = _.bind(function () {
                this.$('.g-child-count-container').removeClass('hide');
                this.$('.g-subfolder-count').text(
                    girder.formatCount(this.parentModel.get('nFolders')));
                this.$('.g-item-count').text(
                    girder.formatCount(this.parentModel.get('nItems')));
            }, this);

            if (this.parentModel.has('nItems')) {
                showCounts();
            } else {
                this.parentModel.set('nItems', 0); // prevents fetching details twice
                this.parentModel.once('g:fetched.details', function () {
                    showCounts();
                }, this).fetch({extraPath: 'details'});
            }

            this.parentModel.off('change:nItems', showCounts, this)
                            .on('change:nItems', showCounts, this)
                            .off('change:nFolders', showCounts, this)
                            .on('change:nFolders', showCounts, this);
        }

        return this;
    },

    /**
     * Change the current parent model, i.e. the resource being shown currently.
     *
     * @param parent The parent model to change to.
     */
    setCurrentModel: function (parent, opts) {
        opts = opts || {};
        this.parentModel = parent;

        this.breadcrumbView.objects = this.breadcrumbs;

        this.folderListView.initialize({
            parentType: parent.resourceName,
            parentId: parent.get('_id'),
            checkboxes: this._checkboxes
        });

        if (parent.resourceName === 'folder') {
            if (this.itemListView) {
                this.itemListView.initialize({
                    folderId: parent.get('_id'),
                    checkboxes: this._checkboxes
                });
            } else {
                this._initFolderViewSubwidgets();
            }
        }

        this.render();
        if (!_.has(opts, 'setRoute') || opts.setRoute) {
            this._setRoute();
        }
    },

    /**
     * Based on a resource collection with either has model references or
     * checkbox references, return a string that describes the collection.
     * :param resources: a hash with different resources.
     * :returns: description of the resources.
     */
    _describeResources: function (resources) {
        /* If the resources aren't English words or don't have simple plurals,
         * this will need to be refactored. */
        var kinds = ['folder', 'item'];

        var desc = [];
        for (var i = 0; i < kinds.length; i += 1) {
            var kind = kinds[i];
            if (resources[kind] && resources[kind].length) {
                desc.push(resources[kind].length + ' ' + kind +
                          (resources[kind].length !== 1 ? 's' : ''));
            }
        }
        switch (desc.length) {
            case 0:
                return 'nothing';
            case 1:
                return desc[0];
            case 2:
                return desc[0] + ' and ' + desc [1];
            /* If we add a third model type, enable this:
            default:
                desc[desc.length-1] = 'and ' + desc[desc.length-1];
                return ', '.join(desc);
             */
        }
    },

    _incrementCounts: function (nFolders, nItems) {
        if (this.parentModel.has('nItems')) {
            this.parentModel.increment('nItems', nItems);
        }
        if (this.parentModel.has('nFolders')) {
            this.parentModel.increment('nFolders', nFolders);
        }
    },

    /**
     * Reloads the folder list view.
     */
    refreshFolderList: function () {
        this.folderListView.collection.fetch(null, true);
    },

    /**
     * Select (highlight) an item in the list.
     * @param item An ItemModel instance representing the item to select.
     */
    selectItem: function (item) {
        this.itemListView.selectItem(item);
    },

    /**
     * Return the currently selected item, or null if there is no selected item.
     */
    getSelectedItem: function () {
        return this.itemListView.getSelectedItem();
    }
});

/**
 * Renders the breadcrumb list in the hierarchy widget.
 */
girder.views.HierarchyBreadcrumbView = girder.View.extend({
    events: {
        'click a.g-breadcrumb-link': function (event) {
            var link = $(event.currentTarget);
            this.trigger('g:breadcrumbClicked', parseInt(link.attr('g-index'), 10));
        }
    },

    initialize: function (settings) {
        this.objects = settings.objects;
    },

    render: function () {
        // Clone the array so we don't alter the instance's copy
        var objects = this.objects.slice(0);

        // Pop off the last object, it refers to the currently viewed
        // object and should be the "active" class, and not a link.
        var active = objects.pop();

        this.$el.html(girder.templates.hierarchyBreadcrumb({
            links: objects,
            current: active
        }));
    }
});
