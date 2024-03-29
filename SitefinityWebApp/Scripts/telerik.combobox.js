﻿(function ($) {

    var $t = $.telerik;

    $t.combobox = function (element, options) {

        $.extend(this, options);

        var $element = $(element);

        this.element = element;
        this.$element = $element;
        this.loader = new $t.list.loader(this);
        this.trigger = new $t.list.trigger(this);
        var $selectIcon = $element.find('> .t-dropdown-wrap > .t-select');

        var pasteMethod = $.browser.msie ? 'paste' : 'input';
        var $text = this.$text = $element.find('> .t-dropdown-wrap > .t-input')
                                         .attr('autocomplete', 'off')
                                         .bind(pasteMethod, $.proxy(function (e) {
                                             var value = e.target.value;
                                             if ($.browser.msie) {
                                                 var selectedText = element.document.selection.createRange().text;
                                                 var text = window.clipboardData.getData("Text");

                                                 if (selectedText && selectedText.length > 0) value = value.replace(selectedText, text);
                                                 else value += text;
                                             }

                                             this.$input.val(value);
                                             resetTimer(this);
                                         }, this));

        var changePropertyEventName = $.browser.msie ? 'propertychange' : 'DOMAttrModified';

        var $input = this.$input = this.$element.find('input:last')
                                       .bind(changePropertyEventName, function (e) {
                                           var attr = 'class',
                                               classValue = $input.attr(attr)

                                           if (classValue != $text.attr(attr))
                                               $text.attr(attr, classValue).addClass('t-input');
                                       });

        if (!$input.attr('disabled'))
            $selectIcon.bind('click', $.proxy(togglePopup, this));

        this.filtering = new $t.list.filtering(this);
        this.filtering.autoFill = function (component, itemText) {
            if (component.autoFill && (component.lastKeyCode != 8 && component.lastKeyCode != 46)) {

                var input = component.$text[0];

                var endIndex = $t.caretPos(input);

                var filterString = input.value.substring(0, endIndex);

                var matchIndex = itemText.toLowerCase().indexOf(filterString.toLowerCase());

                if (matchIndex != -1) {

                    var stringToAppend = itemText.substring(matchIndex + filterString.length);

                    input.value = filterString + stringToAppend;

                    $t.list.selection(input, endIndex, endIndex + stringToAppend.length);
                }
            }
        }

        this.dropDown = new $t.dropDown({
            attr: this.dropDownAttr,
            effects: this.effects,
            onOpen: $.proxy(function () {
                var data = this.data;
                var dropDown = this.dropDown;
                if (data.length == 0) return;

                var text = this.$text.val();
                var selectedIndex = this.selectedIndex;

                if (selectedIndex != -1 && this.isFiltered) {
                    if (text == data[selectedIndex].Text) {
                        this.filteredDataIndexes = [];
                        dropDown.onItemCreate = null;
                        dropDown.dataBind(this.data);
                        this.select(dropDown.$items[selectedIndex]);
                    } else
                        this.filters[this.filter](this, this.data, text);

                    this.isFiltered = false;
                }
            }, this),
            onClick: $.proxy(function (e) { // same as DDL
                this.select(e.item);
                this.trigger.change();
                this.trigger.close();
            }, this)
        });

        this.dropDown.$element.css('direction', $element.closest('.t-rtl').length ? 'rtl' : '');

        this.enable = function () {
            $element
            .removeClass('t-state-disabled')
            .find('.t-input')
                .removeAttr("disabled");

            $selectIcon.bind('click', $.proxy(togglePopup, this));
        }

        this.disable = function () {
            $element
            .addClass('t-state-disabled')
            .find('.t-input')
                .attr('disabled', 'disabled');

            $selectIcon.unbind('click');
        }

        this.fill = function (callback) {
            function updateSelection(component) {
                var value = component.selectedValue || component.value();

                if (value) {
                    component.value(value);
                    return;
                }

                var $items = dropDown.$items;
                var selectedIndex = component.index;
                var $selectedItems = $items.filter('.t-state-selected')
                var selectedItemsLength = $selectedItems.length;

                var item = selectedIndex != -1 && selectedIndex < $items.length
                    ? $items[selectedIndex]
                    : selectedItemsLength > 0
                    ? $selectedItems[selectedItemsLength - 1]
                    : null;

                if (item)
                    component.select(item);
                else {
                    component.selectedIndex = -1;
                    if (component.highlightFirst)
                        component.highlight($items[0]);
                }
            }

            var loader = this.loader;
            var dropDown = this.dropDown;
            var minChars = this.minChars;
            var textValue = this.text();
            var textValueLength = textValue.length;

            if (!dropDown.$items && !loader.ajaxError) {
                if (loader.isAjax() && textValueLength >= minChars) {

                    var postData = {};
                    postData[this.queryString.text] = textValue;

                    loader.ajaxRequest(function (data) {
                        this.dataBind(data, true);
                        updateSelection(this);

                        $t.trigger(this.element, 'dataBound');
                        this.trigger.change();

                        if (callback) callback();
                    },
                    { data: postData });
                }
                else {
                    this.dataBind(this.data, true);
                    updateSelection(this);
                    if (callback) callback();
                }
            }
        }

        this.reload = function () {
            this.dropDown.$items = null;
            this.fill();
        }

        this.select = function (item) {
            var index = this.highlight(item);

            if (index == -1) return index;

            var filteredDataIndexes = this.filteredDataIndexes;

            //set selected Index
            this.selectedIndex = (filteredDataIndexes && filteredDataIndexes.length) > 0 ? filteredDataIndexes[index] : index;

            $t.list.updateTextAndValue(this, $(this.dropDown.$items[index]).text(), this.data[this.selectedIndex].Value);
        }

        this.text = function () {
            return this.$text.val.apply(this.$text, arguments);
        }

        this.value = function () {
            if (arguments.length) {
                var value = arguments[0];
                var index = this.select(function (dataItem) {
                    return value == (dataItem.Value || dataItem.Text);
                });

                if (index == -1) {
                    this.selectedIndex = index;
                    this.$input.val(value);
                    this.text(value);
                }
                this.previousValue = this.$input.val(); //prevent change event

            } else {
                return this.$input.val();
            }
        }

        $t.list.common.call(this);
        $t.list.filters.call(this);
        $t.list.initialize.call(this);

        this.$text
            .bind({
                change: $.proxy(function (e) { e.stopPropagation(); }, this),
                keydown: $.proxy(keydown, this),
                keypress: $.proxy(keypress, this),
                focus: $.proxy(function (e) {
                    var trigger = this.trigger;
                    var dropDown = this.dropDown;
                    if (!dropDown.$items)
                        this.fill(trigger.open);
                    else
                        trigger.open();

                    var $text = this.$text;
                    $t.list.selection($text[0], 0, $text.val().length);

                }, this)
            });

        function togglePopup(e) {
            this.loader.ajaxError = false;
            if (!this.dropDown.isOpened())
                this.$text[0].focus();
            else
                this.trigger.close();
        }

        //PRIVATE
        function resetTimer(component) {
            clearTimeout(component.timeout);
            component.timeout = setTimeout(function () { component.filtering.filter(component) }, component.delay);
        }

        function keydown(e) {
            var trigger = this.trigger;
            var dropDown = this.dropDown;
            var key = e.keyCode || e.which;
            this.lastKeyCode = key;

            //close dropdown
            if (e.altKey && key == 38) {
                trigger.close();
                return;
            }

            //open dropdown
            if (e.altKey && key == 40) {
                trigger.open();
                return;
            }

            if (!e.shiftKey && (key == 38 || key == 40)) {

                e.preventDefault();

                if (!dropDown.$items) this.fill(); //creates items 

                var $items = dropDown.$items;

                var $selectedItem = $items.filter('.t-state-selected:first');

                var $item = $selectedItem.length == 0 || $items.length == 1 ? $items.first()
                             : (key == 38) ? $selectedItem.prev() // up
                             : (key == 40) ? $selectedItem.next() // down
                             : [];

                if ($item.length) {
                    var item = $item[0];

                    this.select(item);
                    dropDown.scrollTo(item);

                    if (!dropDown.isOpened()) trigger.change();
                }
            }

            if (key == 8 || key == 46) {
                var $text = this.$text;

                if ($text.val() != '') resetTimer(this); //reset and start filtering after delay

                setTimeout($.proxy(function () {
                    if ($text.val() == '') {
                        this.selectedIndex = -1;
                        this.$input.val('');
                    } else {
                        this.$input.val(this.$text.val());
                    }
                }, this), 0);
            }

            if (key == 13) {
                if (dropDown.isOpened()) e.preventDefault();

                var $selectedItems = dropDown.$items.filter('.t-state-selected:first');

                if ($selectedItems.length > 0)
                    this.select($selectedItems[0]);
                else
                    this.$input.val(this.$text.val());

                trigger.change();
                trigger.close();
                $t.list.moveToEnd(this.$text[0]);
            }

            if (key == 27 || key == 9) {
                trigger.change();
                trigger.close();
                if (key == 27) this.$text.blur();
            }
        }

        function keypress(e) {
            var key = e.keyCode || e.charCode;

            if (key == 0 || $.inArray(key, $t.list.keycodes) != -1 || e.ctrlKey) return true;

            // always set value. Select(item) will override it if needed.
            setTimeout($.proxy(function () { this.$input.val(this.$text.val()); }, this), 0);

            resetTimer(this);
        }
    }

    $.fn.tComboBox = function (options) {
        return $t.create(this, {
            name: 'tComboBox',
            init: function (element, options) {
                return new $t.combobox(element, options)
            },
            options: options
        });
    };

    // default options
    $.fn.tComboBox.defaults = {
        encoded: true,
        effects: $t.fx.slide.defaults(),
        index: -1,
        autoFill: true,
        highlightFirst: true,
        filter: 0,
        delay: 200,
        minChars: 0,
        cache: true,
        queryString: {
            text: 'text'
        }
    };
})(jQuery);