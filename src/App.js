import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';


import { Editor, getEventRange, getEventTransfer } from 'slate-react';
import { Block, Value } from 'slate';
import initialValue from './value.json';

import { isKeyHotkey } from 'is-hotkey';


import { Button, Icon, Toolbar } from './components';

import imageExtensions from 'image-extensions';
import isUrl from 'is-url';
import styled from 'react-emotion';
import Popup from "reactjs-popup";




/**
 * Define the default node type.
 *
 * @type {String}
 */

const DEFAULT_NODE = 'paragraph'

/**
 * Define hotkey matchers.
 *
 * @type {Function}
 */

const isBoldHotkey = isKeyHotkey('mod+b')
const isItalicHotkey = isKeyHotkey('mod+i')
const isUnderlinedHotkey = isKeyHotkey('mod+u')
const isCodeHotkey = isKeyHotkey('mod+`')
const isTabHotKey = isKeyHotkey('tab')
const isTabHotKeyDown = isKeyHotkey('shift+tab')



//  Image Block start
/**
 * A styled image block component.
 *
 * @type {Component}
 */

const Image = styled('img')`
  display: block;
  max-width: 100%;
  max-height: 20em;
  box-shadow: ${props => (props.selected ? '0 0 0 2px blue;' : 'none')};
`

/*
 * A function to determine whether a URL has an image extension.
 *
 * @param {String} url
 * @return {Boolean}
 */

function isImage(url) {
    return !!imageExtensions.find(url.endsWith)
}

/**
 * A change function to standardize inserting images.
 *
 * @param {Change} change
 * @param {String} src
 * @param {Range} target
 */

function insertImage(change, src, target) {
    if (target) {
        change.select(target)
    }

    change.insertBlock({
        type: 'image',
        data: { src },
    })
}

/**
 * The editor's schema.
 *
 * @type {Object}
 */

const schema = {
    document: {
        last: { type: 'paragraph' },
        normalize: (change, { code, node, child }) => {
            switch (code) {
                case 'last_child_type_invalid': {
                    const paragraph = Block.create('paragraph')
                    return change.insertNodeByKey(node.key, node.nodes.size, paragraph)
                }
            }
        },
    },
    blocks: {
        image: {
            isVoid: true,
        },
    },
}
//  Image block ends

/**
 * Converting image to base64 string.
 * @type {Object} file
 * @return {callback} returns callback with file and base64 string
 */
const toBase64=function (file , callBack) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
        callBack(file,reader.result);
    };
    reader.onerror = function (error) {
        console.log('Error: ', error);
    };
};


function CodeNode(props) {
    return (
        <pre {...props.attributes}>
      <code>{props.children}</code>
    </pre>
    )
}


class App extends React.Component {

    state = {
        value: Value.fromJSON(initialValue)
    }

    onChange = ({value})=> {
        //console.log('value',value)
        this.setState({value})
    }

    /**
     * Check if the current selection has a mark with `type` in it.
     *
     * @param {String} type
     * @return {Boolean}
     */

    hasMark = type => {
        const { value } = this.state
        return value.activeMarks.some(mark => mark.type === type)
    }

    /**
     * Check if the any of the currently selected blocks are of `type`.
     *
     * @param {String} type
     * @return {Boolean}
     */

    hasBlock = type => {
        const { value } = this.state
        return value.blocks.some(node => node.type === type)
    }




    fileChangedHandler = (event) => {
        this.setState({selectedFile: event.target.files[0]})
    }



    uploadHandler = () => {
        toBase64(this.state.selectedFile,(file,base)=>{
          //console.log(base)
            const change = this.state.value.change().call(insertImage, base)
            this.onChange(change)
        });
    }



  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to custom slate editor</h1>
        </header>

          <Toolbar className="Toolbar">
              {this.renderMarkButton('bold', 'format_bold')}
              {this.renderMarkButton('italic', 'format_italic')}
              {this.renderMarkButton('underlined', 'format_underlined')}
              {this.renderMarkButton('code', 'code')}
              {this.renderBlockButton('heading-one', 'looks_one')}
              {this.renderBlockButton('heading-two', 'looks_two')}
              {this.renderBlockButton('block-quote', 'format_quote')}
              {this.renderBlockButton('numbered-list', 'format_list_numbered')}
              {this.renderBlockButton('bulleted-list', 'format_list_bulleted')}

              <Button onMouseDown={this.onClickImage}>
                  <Icon>image</Icon>
              </Button>

              <Popup trigger={<Button><Icon>computer</Icon></Button>} position="top center">
                  <div>
                      <input type="file" onChange={this.fileChangedHandler} accept="image/*"/>
                      <button onClick={this.uploadHandler}>Upload!</button>
                  </div>
              </Popup>

          </Toolbar>

          <Editor
                  value={this.state.value}
                  onChange={this.onChange}

                  spellCheck
                  autoFocus
                  placeholder="Enter some rich text..."
                  onKeyDown={this.onKeyDown}
                  schema={schema}

                  onDrop={this.onDropOrPaste}
                  onPaste={this.onDropOrPaste}
                  renderNode={this.renderNode}
                  renderMark={this.renderMark}
          />



      </div>
    );
  }


  // REach Text
    /**
     * Render a mark-toggling toolbar button.
     *
     * @param {String} type
     * @param {String} icon
     * @return {Element}
     */

    renderMarkButton = (type, icon) => {
        const isActive = this.hasMark(type)

        return (
            <Button
                active={isActive}
                onMouseDown={event => this.onClickMark(event, type)}
            >
                <Icon>{icon}</Icon>
            </Button>
        )
    }

    /**
     * Render a block-toggling toolbar button.
     *
     * @param {String} type
     * @param {String} icon
     * @return {Element}
     */

    renderBlockButton = (type, icon) => {
        let isActive = this.hasBlock(type)

        if (['numbered-list', 'bulleted-list'].includes(type)) {
            const { value } = this.state
            const parent = value.document.getParent(value.blocks.first().key)
            isActive = this.hasBlock('list-item') && parent && parent.type === type
        }

        return (
            <Button
                active={isActive}
                onMouseDown={event => this.onClickBlock(event, type)}
            >
                <Icon>{icon}</Icon>
            </Button>
        )
    }

    /**
     * Render a Slate node.
     *
     * @param {Object} props
     * @return {Element}
     */

    renderNode = props => {
        const { attributes, children, node, isFocused } = props

        console.log('text',children)
        console.log('child',props)

        switch (node.type) {
            case 'block-quote':
                return <blockquote {...attributes}>{children}</blockquote>
            case 'bulleted-list':
                return <ul {...attributes}>{children}</ul>
            case 'heading-one':
                return <h1 {...attributes}>{children}</h1>
            case 'heading-two':
                return <h2 {...attributes}>{children}</h2>
            case 'list-item':
                return <li {...attributes}>{children}</li>
            case 'numbered-list':
                return <ol {...attributes}>{children}</ol>
            case 'image': {
                const src = node.data.get('src')
                return <Image src={src} selected={isFocused} {...attributes} />
            }
            default:

        }
    }

    /**
     * Render a Slate mark.
     *
     * @param {Object} props
     * @return {Element}
     */

    renderMark = props => {
        const { children, mark, attributes } = props

        console.log('hello',mark.type)
        // make tabbing effects here

        switch (mark.type) {
            case 'bold':
                return <strong {...attributes}>{children}</strong>
            case 'code':
                return <code {...attributes}>{children}</code>
            case 'italic':
                return <em {...attributes}>{children}</em>
            case 'underlined':
                return <u {...attributes}>{children}</u>
            case 'tab':
                return  <li {...attributes}>{children}
                    <ul><li {...attributes}>{children}</li></ul>
                </li>
            default:

        }
    }

    /**
     * On change, save the new `value`.
     *
     * @param {Change} change
     */

    // onChange = ({ value }) => {
    //     this.setState({ value })
    // }

    /**
     * On key down, if it's a formatting command toggle a mark.
     *
     * @param {Event} event
     * @param {Change} change
     * @return {Change}
     */

    onKeyDown = (event, change) => {
        let mark;

        // console.log('tabbing',isTabHotKey(event))
        // console.log('down tabbing',isTabHotKeyDown(event))
        console.log(change.value)


        if (isBoldHotkey(event)) {
            mark = 'bold'
        } else if (isItalicHotkey(event)) {
            mark = 'italic'
        } else if (isUnderlinedHotkey(event)) {
            mark = 'underlined'
        } else if (isCodeHotkey(event)) {
            mark = 'code'
        } else if (isTabHotKeyDown(event)) {
            console.log('tabdown')
            mark = 'tabdown'
        } else if (isTabHotKey(event)) {
            console.log('tab')
            mark = 'tab'
        } else {
            return
        }

        event.preventDefault()
        change.toggleMark(mark)
        return true
    }

    /**
     * When a mark button is clicked, toggle the current mark.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickMark = (event, type) => {
        event.preventDefault()
        const { value } = this.state
        const change = value.change().toggleMark(type)
        this.onChange(change)
    }

    /**
     * When a block button is clicked, toggle the block type.
     *
     * @param {Event} event
     * @param {String} type
     */

    onClickBlock = (event, type) => {
        event.preventDefault()
        const { value } = this.state
        const change = value.change()
        const { document } = value

        // Handle everything but list buttons.
        if (type !== 'bulleted-list' && type !== 'numbered-list') {
            const isActive = this.hasBlock(type)
            const isList = this.hasBlock('list-item')

            if (isList) {
                change
                    .setBlocks(isActive ? DEFAULT_NODE : type)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list')
            } else {
                change.setBlocks(isActive ? DEFAULT_NODE : type)
            }
        } else {
            // Handle the extra wrapping required for list buttons.
            const isList = this.hasBlock('list-item')
            const isType = value.blocks.some(block => {
                return !!document.getClosest(block.key, parent => parent.type === type)
            })

            if (isList && isType) {
                change
                    .setBlocks(DEFAULT_NODE)
                    .unwrapBlock('bulleted-list')
                    .unwrapBlock('numbered-list')
            } else if (isList) {
                change
                    .unwrapBlock(
                        type === 'bulleted-list' ? 'numbered-list' : 'bulleted-list'
                    )
                    .wrapBlock(type)
            } else {
                change.setBlocks('list-item').wrapBlock(type)
            }
        }

        this.onChange(change)
    }

//    Image upload

    /**
     * On clicking the image button, prompt for an image and insert it.
     *
     * @param {Event} event
     */

    onClickImage = event => {
        event.preventDefault()
        const src = window.prompt('Enter the URL of the image:')
        if (!src) return

        const change = this.state.value.change().call(insertImage, src)

        this.onChange(change)
    }

    /**
     * On drop, insert the image wherever it is dropped.
     *
     * @param {Event} event
     * @param {Change} change
     * @param {Editor} editor
     */

    onDropOrPaste = (event, change, editor) => {
        const target = getEventRange(event, change.value)
        if (!target && event.type == 'drop') return

        const transfer = getEventTransfer(event)
        const { type, text, files } = transfer

        if (type == 'files') {
            for (const file of files) {
                const reader = new FileReader()
                const [mime] = file.type.split('/')
                if (mime != 'image') continue

                reader.addEventListener('load', () => {
                    editor.change(c => {
                        c.call(insertImage, reader.result, target)
                    })
                })

                reader.readAsDataURL(file)
            }
        }

        if (type == 'text') {
            if (!isUrl(text)) return
            if (!isImage(text)) return
            change.call(insertImage, text, target)
        }
    }
}

export default App;
