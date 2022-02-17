from flask import current_app as app
from flask import render_template, request, make_response, redirect
from . import user as db
import requests
import os

@app.route('/', methods=['GET', 'POST'])
def main():
    if request.method == 'GET':
        return render_template('main.html', extra=f'Currently overseeing {db.get_count()} users 😎️')
    if not db.dupeUser(request.form['name']):
        db.add_user(request.form['name'], request.form['password'], request.form.get('disco', ''), request.form.get('whatsapp', '') if len(request.form.get('whatsapp', '')) != 10 else "91"+request.form.get('whatsapp'))
        requests.post(os.getenv('WEBHOOK'), data={"content": f"Welcome @{request.form['name']} :partying_face:"})
        return redirect("https://discord.gg/69F4DddEyG")
    else:
        db.update_user(request.form['name'], request.form['password'], request.form.get('disco', ''), request.form.get('whatsapp', ''))
        return render_template('main.html', extra=f"{request.form['name']}'s details updated")


@app.errorhandler(404)
def error1(a):
    return make_response(render_template('error.html', page='Error 404', error='404'), 404)


@app.errorhandler(400)
def error2(a):
    return make_response(render_template('error.html', page='Error 400', error='400'), 400)


@app.errorhandler(500)
def error3(a):
    return make_response(render_template('error.html', page='Error 500', error='500'), 500)
