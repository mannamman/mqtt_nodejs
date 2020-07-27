# -*- coding: utf-8 -*- 
import face_recognition
import cv2
import numpy as np
import pandas as pd
import os
import uuid

try:
    cap = cv2.VideoCapture(0) # 0번 웹캠, 1번 USB 카메라
    flag = False
except:
    print("camera loading error")


def agePredict():
    age_list = ['(0,2)', '(4,6)', '(8,12)', '(15,20)', '(25,32)', '(38,43)', '(48,53)', '(60,100)']

    age_net = cv2.dnn.readNetFromCaffe(
        '/home/namth/207lab/suwon207/js/routes/models/deploy_age.prototxt',
        '/home/namth/207lab/suwon207/js/routes/models/age_net.caffemodel')

    # 미리 학습시킬 이미지 추가
    known_face_encodings = []
    # 미리 학습시킬 이미지의 이름을 추가
    known_face_names = []

    dirname = '/home/namth/207lab/suwon207/js/routes/resource'
    files = os.listdir(dirname)  # 해당폴더에 파일리스트를 구하는 것 경로를 넣어주기위해선 앞에dirname을 붙여줘야한다.

    for filename in files:
        name, ext = os.path.splitext(filename)  # 확장자만 따로 떨어뜨린다.
        if ext == '.jpg':
            known_face_names.append(name)
            pathname = os.path.join(dirname, filename)  # 경로를 병합하여 새 경로 생성
            img = face_recognition.load_image_file(pathname)
            try:
                face_encoding = face_recognition.face_encodings(img)[0]
            except IndexError:
                print('IndexError')
            try:
                known_face_encodings.append(face_encoding)
            except:
                print('localerror')
    face_locations = []  # 위,아래,좌,우
    face_encodings = []  # 벡터모음
    face_name = ['name', ]  # csv에 넣을 이름
    face_age = ['age', ]  # csv에 넣을 나이
    post_data = []
    count = 1
    name = ""

    while count <= 15:
        ret, frame = cap.read()
        frame = cv2.flip(frame, 1)  # 거울모드
        # 빠른 인식을 위해 얼굴부분을 감지하는 사각형을 1/4로 축소(얼굴크기)
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)

        # face_recognition의 인수로 사용하기 위해 BGR 이미지를 RGB로 변경
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        # 초기의 배열에 location값과 encoding 값 넣기
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
        if face_encodings:  # 파이썬은 비어있는 리스트는 False를 가짐(얼굴이 찍혔을때만 count를 1씩올려서 총 15번을찍음)
            count = count + 1

        for face_encoding in face_encodings:
            # 얼굴이 이미 학습된 얼굴이미지와 같은지 확인
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, 0.4)  # T/F
            name = "Unknown"
            # distance가 가장 적은 이미지를 찾아서 이름을 출력(0.6정도가 좋다고 함)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)  # argmin 최솟값 인덱스찾는 속성 1,0
            if matches[best_match_index]:
                name = known_face_names[best_match_index]
            face_name.append(name)

            # 두개의 배열을 합치는데 인덱스가 같은 것끼리 합치는 것을 zip
        for (top, right, bottom, left) in face_locations:
            # 탐지된 크기가 1/4이였으므로 4배를 다시 키워줌
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

        # (top, right, bottom, left)
        # face_locations = face_recognition.face_locations(rgb_small_frame)
        # x1, y1, x2, y2 = face.left(), face.top(), face.right(), face.bottom()
        for (top, right, bottom, left) in face_locations:
            face_img = frame[top:bottom, left:right]
            blob = cv2.dnn.blobFromImage(face_img, scalefactor=1, size=(227, 227),
                                         mean=(78.4263377603, 87.7689143744, 114.895847746),
                                         swapRB=False, crop=False)

            # predict age
            age_net.setInput(blob)
            age_preds = age_net.forward()
            age = age_list[age_preds[0].argmax()]
            face_age.append(age)

        cv2.imshow('Video', frame)
        cv2.waitKey(1)

    cap.release()
    cv2.destroyAllWindows()

    for face_name, age in zip(face_name, face_age):
        post_data.append((face_name, age))
    dataframe = pd.DataFrame(post_data)

    client_name = dataframe[0].value_counts().index[0]  # dataframe에서 name열(0)에 있는 갯수중 제일 많은 수가 0번째인덱스로 나타남
    client_age = dataframe[1].value_counts().index[0]  # dataframe에서 age열(1)에 있는 갯수중 제일 많은 수가 0번째인덱스로 나타남
    print(client_name,client_age)
    return client_name, client_age
agePredict()
