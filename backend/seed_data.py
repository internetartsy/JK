import uuid
from sqlalchemy.orm import sessionmaker
from app.db.session import engine
from app.models.land_parcel import LandParcel
from app.models.review_task import ReviewTask, ReviewStatus
from app.models.person import Person
from app.models.tenure import Tenure
from app.models.vgh_map import VGHMap
from geoalchemy2.elements import WKTElement

def seed():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Check if data exists - we will just append or upsert if not found, 
        # but for simplicity let's just create new ones if empty.
        
        # 1. Create a Person
        person = session.query(Person).filter_by(name_english="Muhammad Aslam").first()
        if not person:
            person = Person(
                id=str(uuid.uuid4()),
                name_urdu="محمد اسلم",
                name_english="Muhammad Aslam",
                aadhaar_number="123412341234",
                contact_mobile="0300-1234567"
            )
            session.add(person)
            session.commit() # Commit to get ID
            print("Person created.")
        else:
            print("Person already exists.")

        # 2. Create Land Parcels (Valid, Invalid, Overlapping)
        # We check by khasra_number to avoid duplicates on re-runs
        
        # Parcel 1: Valid Square
        parcel1 = session.query(LandParcel).filter_by(khasra_number="123/45").first()
        if not parcel1:
            parcel1 = LandParcel(
                id=str(uuid.uuid4()),
                village_id="V-001",
                khasra_number="123/45",
                area_text="10 Kanal",
                area_geom=5000.0,
                status="active",
                version=1,
                # Valid Polygon (Square 0-100)
                geometry=WKTElement("POLYGON((0 0, 0 100, 100 100, 100 0, 0 0))", srid=4326),
                owner_id=person.id
            )
            session.add(parcel1)
        
        # Parcel 2: Invalid Bowtie
        parcel2 = session.query(LandParcel).filter_by(khasra_number="67/89").first()
        if not parcel2:
            parcel2 = LandParcel(
                id=str(uuid.uuid4()),
                village_id="V-001",
                khasra_number="67/89",
                area_text="5 Marla",
                area_geom=125.0,
                status="disputed",
                version=1,
                # Invalid Polygon (Bowtie / Self-Intersection)
                geometry=WKTElement("POLYGON((0 0, 100 100, 0 100, 100 0, 0 0))", srid=4326),
                owner_id=person.id
            )
            session.add(parcel2)
            
        # Parcel 3: Overlapping with Parcel 1
        parcel3 = session.query(LandParcel).filter_by(khasra_number="99/99").first()
        if not parcel3:
            parcel3 = LandParcel(
                id=str(uuid.uuid4()),
                village_id="V-001",
                khasra_number="99/99",
                area_text="8 Kanal",
                area_geom=4000.0,
                status="active",
                version=1,
                # Overlaps with Parcel 1 (50,50 to 150,150)
                geometry=WKTElement("POLYGON((50 50, 50 150, 150 150, 150 50, 50 50))", srid=4326),
                owner_id=person.id
            )
            session.add(parcel3)

        session.commit() # Commit parcels to get IDs for Tenures/VGH

        # 3. Create Tenures
        if parcel1:
            if not session.query(Tenure).filter_by(parcel_id=parcel1.id).first():
                tenure1 = Tenure(
                    id=str(uuid.uuid4()),
                    parcel_id=parcel1.id,
                    person_id=person.id,
                    rights_type="Owner",
                    share="1.0"
                )
                session.add(tenure1)
        
        if parcel2:
            if not session.query(Tenure).filter_by(parcel_id=parcel2.id).first():
                tenure2 = Tenure(
                    id=str(uuid.uuid4()),
                    parcel_id=parcel2.id,
                    person_id=person.id,
                    rights_type="Owner",
                    share="1.0"
                )
                session.add(tenure2)

        # 4. Create VGH Mappings
        if parcel1:
            if not session.query(VGHMap).filter_by(parcel_id=parcel1.id).first():
                vgh1 = VGHMap(
                    id=str(uuid.uuid4()),
                    village_code="V-001",
                    halqa_code="H-001",
                    girdawari_code="G-001",
                    parcel_id=parcel1.id
                )
                session.add(vgh1)
        
        if parcel2:
             if not session.query(VGHMap).filter_by(parcel_id=parcel2.id).first():
                vgh2 = VGHMap(
                    id=str(uuid.uuid4()),
                    village_code="V-001",
                    halqa_code="H-001",
                    girdawari_code="G-002",
                    parcel_id=parcel2.id
                )
                session.add(vgh2)

        # 5. Create Review Tasks
        if not session.query(ReviewTask).filter_by(document_id="DOC-001").first():
            task1 = ReviewTask(
                id=str(uuid.uuid4()),
                document_id="DOC-001",
                document_type="Girdawari",
                confidence_score=0.65,
                extracted_fields={"owner": "Ali", "khasra": "12"},
                status=ReviewStatus.PENDING
            )
            session.add(task1)

        if not session.query(ReviewTask).filter_by(document_id="DOC-002").first():
            task2 = ReviewTask(
                id=str(uuid.uuid4()),
                document_id="DOC-002",
                document_type="Khasra",
                confidence_score=0.92,
                extracted_fields={"owner": "Ahmed", "khasra": "55"},
                status=ReviewStatus.APPROVED
            )
            session.add(task2)

        session.commit()
        print("Data seeded successfully!")

    except Exception as e:
        print(f"Error seeding data: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    seed()
