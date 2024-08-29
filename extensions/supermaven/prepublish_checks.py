def main():
    chat_js_file = open("main.chat.js").read()
    assert '127.0.0.1' not in chat_js_file
    assert 'chatapi.supermaven.com' in chat_js_file

if __name__ == "__main__":
    main()